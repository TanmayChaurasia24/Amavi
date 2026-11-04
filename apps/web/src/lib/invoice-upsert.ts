import { eq } from "drizzle-orm";
import { db } from "../db";
import { invoices, clients } from "../db/schema";
import type { NewInvoice } from "../db/schema";
import { parseInvoiceSummary } from "./paypal/types";
import { mapPaypalStatusToInternal } from "./paypal/status";
import { getInvoice } from "./paypal/invoices";
import type { PaypalInvoice } from "./paypal/types";
import { reconcilePaymentWithPlans } from "./agent/reconcile";

/**
 * Given a PayPal invoice object, upsert into our DB invoices table.
 * Returns the updated/inserted invoice row.
 */
export async function upsertInvoiceFromPaypal(
  paypalInvoice: PaypalInvoice,
  ownerId?: string | null
): Promise<typeof invoices.$inferSelect> {
  const summary = parseInvoiceSummary(paypalInvoice);
  const internalStatus = mapPaypalStatusToInternal(summary);

  const recipientEmail =
    paypalInvoice.primary_recipients?.[0]?.billing_info?.email_address;

  // Try to find or create a client record
  let clientId: string | null = null;
  if (recipientEmail) {
    const existingClient = await db.query.clients.findFirst({
      where: eq(clients.email, recipientEmail),
    });
    if (existingClient) {
      clientId = existingClient.id;
      // If client didn't have an owner, link it
      if (ownerId && !existingClient.ownerId) {
        await db
          .update(clients)
          .set({ ownerId })
          .where(eq(clients.id, existingClient.id));
      }
    } else {
      const recipientName =
        paypalInvoice.primary_recipients?.[0]?.billing_info?.name?.full_name ??
        recipientEmail;
      const [newClient] = await db
        .insert(clients)
        .values({
          name: recipientName,
          email: recipientEmail,
          ownerId: ownerId ?? undefined,
        })
        .returning();
      clientId = newClient?.id ?? null;
    }
  }

  // Check if existing invoice has active payment plans with paid instalments
  const existingInvoice = await db.query.invoices.findFirst({
    where: eq(invoices.paypalInvoiceId, summary.paypalInvoiceId),
    with: {
      paymentPlans: {
        with: {
          instalments: true,
        },
      },
    },
  });

  let planPaidCents = 0;
  if (existingInvoice?.paymentPlans) {
    for (const plan of existingInvoice.paymentPlans) {
      for (const leg of plan.instalments) {
        if (leg.status === "PAID") {
          planPaidCents += leg.amountCents;
        }
      }
    }
  }

  const effectiveAmountPaidCents = Math.max(summary.paidCents, planPaidCents);
  let effectiveStatus = internalStatus;
  if (effectiveAmountPaidCents >= summary.totalCents && summary.totalCents > 0) {
    effectiveStatus = "PAID";
  } else if (effectiveAmountPaidCents > 0) {
    effectiveStatus = "PARTIALLY_PAID";
  } else if (existingInvoice?.paymentPlans?.some((p) => p.status === "ACTIVE")) {
    effectiveStatus = "IN_NEGOTIATION";
  }

  const invoiceData: NewInvoice = {
    paypalInvoiceId: summary.paypalInvoiceId,
    clientId,
    ownerId: ownerId ?? undefined,
    totalCents: summary.totalCents,
    amountPaidCents: effectiveAmountPaidCents,
    currency: summary.currency,
    dueDate: summary.dueDate ?? undefined,
    status: effectiveStatus,
    paypalStatus: summary.paypalStatus,
    recipientViewUrl: summary.payerViewUrl ?? undefined,
    updatedAt: new Date(),
  };

  // Upsert: insert or update on conflict
  const [result] = await db
    .insert(invoices)
    .values(invoiceData)
    .onConflictDoUpdate({
      target: invoices.paypalInvoiceId,
      set: {
        clientId: invoiceData.clientId,
        totalCents: invoiceData.totalCents,
        amountPaidCents: invoiceData.amountPaidCents,
        currency: invoiceData.currency,
        dueDate: invoiceData.dueDate,
        status: invoiceData.status,
        paypalStatus: invoiceData.paypalStatus,
        recipientViewUrl: invoiceData.recipientViewUrl,
        ...(ownerId ? { ownerId } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!result) throw new Error("Upsert returned no row");

  // Reconcile if the invoice has payments or is marked paid
  if (
    result.status === "PAID" ||
    result.status === "PARTIALLY_PAID" ||
    result.amountPaidCents > 0 ||
    summary.paidCents > 0
  ) {
    try {
      await reconcilePaymentWithPlans(
        summary.paypalInvoiceId,
        summary.paidCents || result.amountPaidCents
      );
    } catch (reconcileErr) {
      console.warn(
        `[upsertInvoiceFromPaypal] Reconciliation notice for ${summary.paypalInvoiceId}:`,
        reconcileErr instanceof Error ? reconcileErr.message : reconcileErr
      );
    }
  }

  return result;
}

/**
 * Fetch invoice from PayPal by ID, then upsert into our DB.
 * Reconciles payments with multi-installment plans automatically.
 * Use this from webhooks and the sync endpoint.
 */
export async function fetchAndUpsertInvoice(
  paypalInvoiceId: string,
  ownerId?: string | null
): Promise<typeof invoices.$inferSelect> {
  const paypalInvoice = await getInvoice(paypalInvoiceId);
  return await upsertInvoiceFromPaypal(paypalInvoice, ownerId);
}
