import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "../../../../src/lib/env";
import { db } from "../../../../src/db";
import { webhookEvents } from "../../../../src/db/schema";
import { verifyWebhookSignature } from "../../../../src/lib/paypal/invoices";
import { fetchAndUpsertInvoice } from "../../../../src/lib/invoice-upsert";
import { eq } from "drizzle-orm";

// ─── Webhook event schema ─────────────────────────────────────────────────────
const WebhookEventSchema = z.object({
  id: z.string(),
  event_type: z.string(),
  resource_type: z.string().optional(),
  resource: z.record(z.string(), z.unknown()).optional(),
  summary: z.string().optional(),
  create_time: z.string().optional(),
});

// ─── Events we process (vs log-only) ─────────────────────────────────────────
const PROCESS_EVENTS = new Set([
  "INVOICING.INVOICE.PAID",
  "INVOICING.INVOICE.UPDATED",
  "INVOICING.INVOICE.CANCELLED",
  "INVOICING.INVOICE.REFUNDED",
]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Read raw body
  const rawBody = await req.text();

  // 2. Verify webhook signature
  const transmissionId = req.headers.get("paypal-transmission-id") ?? "";
  const transmissionTime = req.headers.get("paypal-transmission-time") ?? "";
  const certUrl = req.headers.get("paypal-cert-url") ?? "";
  const authAlgo = req.headers.get("paypal-auth-algo") ?? "";
  const transmissionSig = req.headers.get("paypal-transmission-sig") ?? "";

  if (env.PAYPAL_WEBHOOK_VERIFY) {
    try {
      const isValid = await verifyWebhookSignature({
        transmissionId,
        transmissionTime,
        certUrl,
        authAlgo,
        transmissionSig,
        webhookId: env.PAYPAL_WEBHOOK_ID,
        webhookEvent: JSON.parse(rawBody) as unknown,
      });
      if (!isValid) {
        console.warn("[webhook] Invalid signature – rejecting");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } catch (err) {
      console.error("[webhook] Signature verification threw:", err);
      return NextResponse.json(
        { error: "Signature verification error" },
        { status: 400 }
      );
    }
  } else {
    if (env.NODE_ENV !== "development") {
      console.error(
        "[webhook] PAYPAL_WEBHOOK_VERIFY=false is ONLY allowed in development. Rejecting."
      );
      return NextResponse.json(
        { error: "Signature verification required in non-dev environments" },
        { status: 401 }
      );
    }
    console.warn(
      "⚠️  [webhook] PAYPAL_WEBHOOK_VERIFY=false — SKIPPING SIGNATURE CHECK (dev only)"
    );
  }

  // 3. Parse event
  let event: z.infer<typeof WebhookEventSchema>;
  try {
    event = WebhookEventSchema.parse(JSON.parse(rawBody));
  } catch (err) {
    console.error("[webhook] Failed to parse event body:", err);
    return NextResponse.json({ error: "Invalid event body" }, { status: 400 });
  }

  const { id: paypalEventId, event_type: eventType, resource } = event;

  // 4. Idempotency: check if already processed
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.paypalEventId, paypalEventId),
  });
  if (existing) {
    console.log(`[webhook] Duplicate event ${paypalEventId} – returning 200`);
    return NextResponse.json({ status: "duplicate" });
  }

  // Extract resource_id from the resource object
  const invoiceObj = resource?.["invoice"] as Record<string, unknown> | undefined;
  const resourceId =
    (resource?.["id"] as string | undefined) ??
    (invoiceObj?.["id"] as string | undefined) ??
    null;

  // 5. Insert WebhookEvents row
  const [eventRow] = await db
    .insert(webhookEvents)
    .values({
      paypalEventId,
      eventType,
      resourceId,
      payload: JSON.parse(rawBody) as Record<string, unknown>,
      receivedAt: new Date(),
    })
    .returning();

  // 6. Process the event
  let processingError: string | null = null;

  if (PROCESS_EVENTS.has(eventType)) {
    try {
      // Derive the PayPal invoice ID from the resource
      const invoiceId =
        (resource?.["id"] as string | undefined) ??
        resourceId;

      if (!invoiceId) {
        throw new Error(`Could not find invoice ID in resource for event ${eventType}`);
      }

      // Fetch from PayPal (don't trust payload amounts)
      const row = await fetchAndUpsertInvoice(invoiceId);
      console.log(
        `[webhook] Processed ${eventType} for invoice ${invoiceId} → status=${row.status} paid=${row.amountPaidCents}`
      );

      // Mark processed
      if (eventRow) {
        await db
          .update(webhookEvents)
          .set({ processedAt: new Date() })
          .where(eq(webhookEvents.id, eventRow.id));
      }
    } catch (err) {
      processingError = err instanceof Error ? err.message : String(err);
      console.error(`[webhook] Error processing ${eventType}:`, err);
    }
  } else {
    console.log(`[webhook] Log-only event type: ${eventType}`);
    if (eventRow) {
      await db
        .update(webhookEvents)
        .set({ processedAt: new Date(), error: "log-only" })
        .where(eq(webhookEvents.id, eventRow.id));
    }
  }

  // 7. Store any processing error on the row
  if (processingError && eventRow) {
    await db
      .update(webhookEvents)
      .set({ error: processingError })
      .where(eq(webhookEvents.id, eventRow.id));
  }

  // Always return 200 for verified events so PayPal doesn't retry
  return NextResponse.json({ status: "ok" });
}

