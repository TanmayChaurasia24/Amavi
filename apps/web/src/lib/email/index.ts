import { env } from "../env";
import { sendEmail, SendEmailResult } from "./client";
import {
  renderAgentReplyEmail,
  renderReminderEmail,
  renderOwnerAlertEmail,
} from "./templates";
import { db } from "../../db";
import { invoices } from "../../db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export interface OutboundReplyParams {
  invoice: {
    id: string;
    paypalInvoiceId: string;
    replyToken?: string | null;
    recipientViewUrl?: string | null;
  };
  owner: {
    displayName: string;
    tone?: string;
  };
  client: {
    name: string;
    email: string;
  };
  replyText: string;
  inReplyToMessageId?: string | null;
}

export interface OutboundReminderParams {
  invoice: {
    id: string;
    paypalInvoiceId: string;
    totalCents: number;
    amountPaidCents: number;
    currency?: string;
    replyToken?: string | null;
    recipientViewUrl?: string | null;
  };
  owner: {
    displayName: string;
    tone?: string;
  };
  client: {
    name: string;
    email: string;
  };
  note?: string;
}

export interface OwnerAlertParams {
  owner: {
    name: string;
    displayName: string;
    notificationEmail: string;
  };
  invoice: {
    id: string;
    paypalInvoiceId: string;
  };
  client?: {
    name: string;
  } | null;
  reason: string;
  summary: string;
}

/**
 * Returns or generates a unique reply token for an invoice.
 */
export async function ensureInvoiceReplyToken(invoiceId: string, currentToken?: string | null): Promise<string> {
  if (currentToken && currentToken.length >= 16) {
    return currentToken;
  }

  // Generate 32-char hex token
  const token = crypto.randomUUID().replace(/-/g, "");
  await db
    .update(invoices)
    .set({ replyToken: token })
    .where(eq(invoices.id, invoiceId));

  return token;
}

/**
 * Constructs the canonical reply-to email address for an invoice.
 */
export function buildReplyToAddress(replyToken: string): string {
  return `reply+${replyToken.toLowerCase()}@${env.INBOUND_EMAIL_DOMAIN}`;
}

/**
 * Sends an outbound reply from the Settle AI agent to a client.
 */
export async function sendOutboundAgentReply(
  params: OutboundReplyParams
): Promise<SendEmailResult> {
  const { invoice, owner, client, replyText, inReplyToMessageId } = params;

  const replyToken = await ensureInvoiceReplyToken(invoice.id, invoice.replyToken);
  const replyTo = buildReplyToAddress(replyToken);
  const subject = `Re: Invoice #${invoice.paypalInvoiceId} from ${owner.displayName}`;

  const rendered = renderAgentReplyEmail({
    ownerDisplayName: owner.displayName,
    clientName: client.name,
    invoiceNumber: invoice.paypalInvoiceId,
    replyText,
    payLink: invoice.recipientViewUrl || undefined,
  });

  const headers: Record<string, string> = {};
  if (inReplyToMessageId) {
    const formattedId = inReplyToMessageId.startsWith("<")
      ? inReplyToMessageId
      : `<${inReplyToMessageId}>`;
    headers["In-Reply-To"] = formattedId;
    headers["References"] = formattedId;
  }

  return sendEmail({
    to: client.email,
    replyTo,
    subject,
    text: rendered.text,
    html: rendered.html,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
}

/**
 * Sends an automated invoice payment reminder to a client.
 */
export async function sendOutboundReminder(
  params: OutboundReminderParams
): Promise<SendEmailResult> {
  const { invoice, owner, client, note } = params;

  const replyToken = await ensureInvoiceReplyToken(invoice.id, invoice.replyToken);
  const replyTo = buildReplyToAddress(replyToken);
  const subject = `Invoice #${invoice.paypalInvoiceId} from ${owner.displayName}`;
  const balanceCents = Math.max(0, invoice.totalCents - invoice.amountPaidCents);

  const rendered = renderReminderEmail({
    ownerDisplayName: owner.displayName,
    clientName: client.name,
    invoiceNumber: invoice.paypalInvoiceId,
    balanceCents,
    currency: invoice.currency || "USD",
    note,
    payLink: invoice.recipientViewUrl || undefined,
  });

  return sendEmail({
    to: client.email,
    replyTo,
    subject,
    text: rendered.text,
    html: rendered.html,
  });
}

/**
 * Sends an alert to the owner when an escalation or approval ticket is created.
 */
export async function sendOwnerAlert(
  params: OwnerAlertParams
): Promise<SendEmailResult> {
  const { owner, invoice, client, reason, summary } = params;
  const approvalsUrl = `${env.APP_BASE_URL}/dashboard/approvals`;
  const subject = `[Action Required] Review needed for Invoice #${invoice.paypalInvoiceId}`;

  const rendered = renderOwnerAlertEmail({
    ownerName: owner.displayName || owner.name,
    invoiceNumber: invoice.paypalInvoiceId,
    clientName: client?.name || "Client",
    reason,
    summary,
    approvalsUrl,
  });

  return sendEmail({
    to: owner.notificationEmail,
    subject,
    text: rendered.text,
    html: rendered.html,
  });
}

export * from "./client";
export * from "./templates";
export * from "./parser";
