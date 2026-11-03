import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/db";
import { invoices, messages } from "@/db/schema";
import {
  verifyResendWebhookSignature,
  fetchReceivedEmail,
  ReceivedEmailDetails,
} from "@/lib/email/client";
import {
  extractReplyToken,
  extractBareEmail,
  isAutoReplyEmail,
  normalizeHeaders,
  htmlToPlainText,
  cleanInboundEmailText,
} from "@/lib/email/parser";
import { sendOutboundAgentReply } from "@/lib/email";
import { handleClientMessage } from "@/lib/agent/runner";
import { escalateToOwner } from "@/lib/agent/tools";
import { eq, and, gte, sql } from "drizzle-orm";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  // 1. Read Raw Body
  const rawBody = await req.text();

  // 2. Verify Svix Signature (if RESEND_WEBHOOK_SECRET is configured)
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (env.RESEND_WEBHOOK_SECRET) {
    const isValid = verifyResendWebhookSignature({
      rawBody,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      secret: env.RESEND_WEBHOOK_SECRET,
    });

    if (!isValid) {
      console.warn("[webhook/email] Invalid webhook signature detected; rejecting request.");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  }

  // 3. Parse Webhook Payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Handle only 'email.received' events
  if (payload.type !== "email.received") {
    return NextResponse.json(
      { message: `Event '${payload.type}' ignored` },
      { status: 200 }
    );
  }

  const emailData = payload.data || {};
  const emailId = emailData.id || emailData.email_id;

  if (!emailId) {
    return NextResponse.json({ error: "Missing email id" }, { status: 400 });
  }

  // 4. Deduplicate by Email ID
  const existingMsg = await db.query.messages.findFirst({
    where: eq(messages.externalId, emailId),
  });

  if (existingMsg) {
    console.log(`[webhook/email] Duplicate email id '${emailId}' already recorded. Skipping.`);
    return NextResponse.json(
      { message: "Duplicate email event already processed" },
      { status: 200 }
    );
  }

  // 5. Fetch Full Email Contents via Resend Receiving API
  let fullEmail: ReceivedEmailDetails | null = null;
  if (env.RESEND_API_KEY && env.EMAIL_CHANNEL_ENABLED) {
    fullEmail = await fetchReceivedEmail(emailId);
  }

  // Fallback to embedded payload (e.g. for mock testing or local dev)
  if (!fullEmail) {
    fullEmail = {
      id: emailId,
      from: emailData.from || "",
      to: Array.isArray(emailData.to) ? emailData.to : [emailData.to || ""],
      subject: emailData.subject || "",
      html: emailData.html || null,
      text: emailData.text || null,
      headers: emailData.headers || {},
      createdAt: emailData.created_at,
    };
  }

  const headers = normalizeHeaders(fullEmail.headers);

  // 6. Extract Reply Token from 'To' addresses
  const token = extractReplyToken(fullEmail.to);
  if (!token) {
    console.log(`[webhook/email] No reply token found in recipients: ${fullEmail.to.join(", ")}`);
    // Store as unassociated ignored message if possible
    return NextResponse.json(
      { message: "Ignored: No valid reply token found in recipient address" },
      { status: 200 }
    );
  }

  // 7. Find Matching Invoice
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.replyToken, token),
    with: { client: true, owner: true },
  });

  if (!invoice) {
    console.log(`[webhook/email] No invoice matches reply token '${token}'. Storing ignored.`);
    return NextResponse.json(
      { message: "Ignored: Unknown reply token" },
      { status: 200 }
    );
  }

  // Extract text and prepare raw content
  const rawText = fullEmail.text || htmlToPlainText(fullEmail.html || "");
  const cleanedText = cleanInboundEmailText(rawText);

  // 8. Auto-reply / Out-of-office / Bounce check
  const autoCheck = isAutoReplyEmail({
    headers,
    subject: fullEmail.subject,
    from: fullEmail.from,
  });

  if (autoCheck.isAutoReply) {
    console.log(
      `[webhook/email] Auto-reply detected on invoice ${invoice.id}: ${autoCheck.reason}`
    );
    await db.insert(messages).values({
      invoiceId: invoice.id,
      direction: "INBOUND",
      sender: fullEmail.from,
      content: cleanedText || "[Automated email response]",
      intent: "OTHER",
      channel: "email",
      externalId: emailId,
      emailMessageId: headers.messageId ?? null,
      inReplyTo: headers.inReplyTo ?? null,
      ignoredReason: autoCheck.reason ?? "auto_reply_detected",
      deliveryStatus: "ignored",
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: "Auto-reply ignored to prevent loops", reason: autoCheck.reason },
      { status: 200 }
    );
  }

  // 9. Sender Verification (From must match client's email on file)
  const senderEmail = extractBareEmail(fullEmail.from);
  const clientEmail = invoice.client?.email?.toLowerCase().trim();

  if (!clientEmail || senderEmail !== clientEmail) {
    console.warn(
      `[webhook/email] Sender mismatch for invoice ${invoice.id}: from=${senderEmail}, expected=${clientEmail}`
    );

    // Store inbound message tagged as unrecognized sender
    await db.insert(messages).values({
      invoiceId: invoice.id,
      direction: "INBOUND",
      sender: fullEmail.from,
      content: cleanedText || "[Email from unrecognized address]",
      intent: "OTHER",
      channel: "email",
      externalId: emailId,
      emailMessageId: headers.messageId ?? null,
      inReplyTo: headers.inReplyTo ?? null,
      ignoredReason: `unrecognized_sender: expected ${clientEmail}, received from ${senderEmail}`,
      deliveryStatus: "escalated",
      createdAt: new Date(),
    });

    // Escalate to owner immediately — agent takes NO autonomous action
    await escalateToOwner(
      invoice.id,
      "Unrecognized sender: Message received from unexpected email address",
      `Received reply from "${fullEmail.from}", but invoice client email on file is "${clientEmail}".`,
      { from: fullEmail.from, clientEmail, emailId }
    );

    return NextResponse.json(
      { message: "Sender mismatch escalated to owner; no agent action taken" },
      { status: 200 }
    );
  }

  // 10. Rate Cap: Max Agent Replies per Invoice per 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentOutboundCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(
      and(
        eq(messages.invoiceId, invoice.id),
        eq(messages.direction, "OUTBOUND"),
        gte(messages.createdAt, twentyFourHoursAgo)
      )
    );

  const outboundCount = Number(recentOutboundCountResult[0]?.count ?? 0);
  if (outboundCount >= env.MAX_AGENT_REPLIES_PER_INVOICE_PER_DAY) {
    console.warn(
      `[webhook/email] Rate cap reached for invoice ${invoice.id}: ${outboundCount}/${env.MAX_AGENT_REPLIES_PER_INVOICE_PER_DAY} replies in 24h.`
    );

    await db.insert(messages).values({
      invoiceId: invoice.id,
      direction: "INBOUND",
      sender: fullEmail.from,
      content: cleanedText,
      intent: "OTHER",
      channel: "email",
      externalId: emailId,
      emailMessageId: headers.messageId ?? null,
      inReplyTo: headers.inReplyTo ?? null,
      ignoredReason: `rate_limit_exceeded: ${outboundCount}/${env.MAX_AGENT_REPLIES_PER_INVOICE_PER_DAY} replies in 24h`,
      deliveryStatus: "escalated",
      createdAt: new Date(),
    });

    await escalateToOwner(
      invoice.id,
      "Rate limit reached: Maximum agent replies exceeded in 24 hours",
      `Invoice received email reply from ${senderEmail}, but daily limit of ${env.MAX_AGENT_REPLIES_PER_INVOICE_PER_DAY} automated replies has been reached.`,
      { emailId, outboundCount, dailyLimit: env.MAX_AGENT_REPLIES_PER_INVOICE_PER_DAY }
    );

    return NextResponse.json(
      { message: "Rate limit reached; escalated to owner" },
      { status: 200 }
    );
  }

  // 11. Run Channel-Agnostic Agent Pipeline
  try {
    const handleResult = await handleClientMessage({
      invoiceId: invoice.id,
      ownerId: invoice.ownerId ?? undefined,
      text: cleanedText,
      channel: "email",
      externalId: emailId,
      emailMessageId: headers.messageId ?? undefined,
      inReplyTo: headers.inReplyTo ?? undefined,
      senderEmail,
      senderName: invoice.client?.name ?? "Client",
    });

    // 12. Dispatch Outbound Reply Email via Resend
    if (handleResult.replyText && invoice.owner && invoice.client) {
      const outboundEmailRes = await sendOutboundAgentReply({
        invoice: {
          id: invoice.id,
          paypalInvoiceId: invoice.paypalInvoiceId,
          replyToken: invoice.replyToken,
          recipientViewUrl: invoice.recipientViewUrl,
        },
        owner: {
          displayName: invoice.owner.displayName,
          tone: invoice.owner.tone,
        },
        client: {
          name: invoice.client.name,
          email: invoice.client.email,
        },
        replyText: handleResult.replyText,
        inReplyToMessageId: headers.messageId ?? undefined,
      });

      // Update outbound message with delivery status and Resend ID
      if (handleResult.outboundMessageId && outboundEmailRes.id) {
        await db
          .update(messages)
          .set({
            externalId: outboundEmailRes.id,
            deliveryStatus: outboundEmailRes.error ? "failed" : "sent",
          })
          .where(eq(messages.id, handleResult.outboundMessageId));
      }
    }

    return NextResponse.json(
      {
        success: true,
        invoiceId: invoice.id,
        actionTaken: handleResult.agentResult.actionTaken,
        durationMs: Date.now() - startTime,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[webhook/email] Error processing message on invoice ${invoice.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Processing error",
      },
      { status: 200 }
    );
  }
}
