/**
 * Email templates for Amavi outbound emails.
 *
 * Security:
 * - All dynamic text (client names, reply text, reasons) is HTML-escaped.
 * - Minimal, robust inline CSS tested for major email clients.
 * - Clear distinction between plain-text and HTML versions.
 */

export interface EmailTemplateData {
  ownerDisplayName: string;
  clientName?: string;
  invoiceId: string;
  paypalInvoiceId?: string;
  totalCents: number;
  amountPaidCents: number;
  currency?: string;
  payLink?: string;
  replyText?: string;
  note?: string;
  reason?: string;
  approvalsUrl?: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(cents: number, currency: string = "USD"): string {
  const amount = (cents / 100).toFixed(2);
  return `${currency} $${amount}`;
}

/**
 * 1. Agent Reply Email Template
 */
export function renderAgentReplyEmail(data: {
  ownerDisplayName: string;
  clientName: string;
  invoiceNumber: string;
  replyText: string;
  payLink?: string;
}) {
  const escapedOwner = escapeHtml(data.ownerDisplayName);
  const escapedClient = escapeHtml(data.clientName);
  const escapedReply = escapeHtml(data.replyText).replace(/\n/g, "<br />");
  const payLink = data.payLink || "https://www.sandbox.paypal.com";

  const text = `Hi ${data.clientName},

${data.replyText}

${data.payLink ? `Pay or review your invoice online:\n${data.payLink}\n\n` : ""}Best regards,
${data.ownerDisplayName} via Amavi

---
To discuss or adjust terms, simply reply directly to this email.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Update from ${escapedOwner}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 16px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="background-color: #0f172a; padding: 20px 24px; color: #ffffff;">
      <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Invoice #${escapeHtml(data.invoiceNumber)}</h2>
      <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">From ${escapedOwner}</p>
    </div>
    <div style="padding: 24px;">
      <p style="margin-top: 0; font-size: 15px; line-height: 1.6;">Hi ${escapedClient},</p>
      <div style="font-size: 15px; line-height: 1.6; color: #334155; margin: 16px 0;">
        ${escapedReply}
      </div>
      ${
        data.payLink
          ? `<div style="margin: 28px 0;">
        <a href="${escapeHtml(
          payLink
        )}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; display: inline-block;">
          Review &amp; Pay via PayPal
        </a>
      </div>`
          : ""
      }
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        You can reply directly to this email to discuss payment arrangements or request adjustments.
      </p>
    </div>
    <div style="background-color: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 12px; color: #64748b;">
      Sent on behalf of ${escapedOwner} by Amavi Collections Agent
    </div>
  </div>
</body>
</html>`;

  return { text, html };
}

/**
 * 2. Invoice Payment Reminder Email Template
 */
export function renderReminderEmail(data: {
  ownerDisplayName: string;
  clientName: string;
  invoiceNumber: string;
  balanceCents: number;
  currency?: string;
  note?: string;
  payLink?: string;
}) {
  const currency = data.currency || "USD";
  const formattedBalance = formatCurrency(data.balanceCents, currency);
  const escapedOwner = escapeHtml(data.ownerDisplayName);
  const escapedClient = escapeHtml(data.clientName);
  const defaultNote = `This is a friendly reminder that your balance of ${formattedBalance} for Invoice #${data.invoiceNumber} is past due.`;
  const note = data.note || defaultNote;
  const escapedNote = escapeHtml(note).replace(/\n/g, "<br />");
  const payLink = data.payLink || "https://www.sandbox.paypal.com";

  const text = `Hi ${data.clientName},

${note}

Outstanding Balance: ${formattedBalance}

${data.payLink ? `Pay securely online:\n${data.payLink}\n\n` : ""}If you have questions or would like to propose a payment plan, simply reply to this email.

Best regards,
${data.ownerDisplayName}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder for Invoice #${escapeHtml(data.invoiceNumber)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 16px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="background-color: #0f172a; padding: 20px 24px; color: #ffffff;">
      <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Payment Reminder</h2>
      <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Invoice #${escapeHtml(data.invoiceNumber)} &bull; ${escapedOwner}</p>
    </div>
    <div style="padding: 24px;">
      <p style="margin-top: 0; font-size: 15px; line-height: 1.6;">Hi ${escapedClient},</p>
      <div style="font-size: 15px; line-height: 1.6; color: #334155; margin: 16px 0;">
        ${escapedNote}
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <span style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Balance Due</span>
        <div style="font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 4px;">${formattedBalance}</div>
      </div>
      ${
        data.payLink
          ? `<div style="margin: 24px 0;">
        <a href="${escapeHtml(
          payLink
        )}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; display: inline-block;">
          Pay via PayPal
        </a>
      </div>`
          : ""
      }
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        Need to arrange an installment plan or have questions? Just reply directly to this email.
      </p>
    </div>
    <div style="background-color: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 12px; color: #64748b;">
      Sent on behalf of ${escapedOwner} by Amavi Collections Agent
    </div>
  </div>
</body>
</html>`;

  return { text, html };
}

/**
 * 3. Owner Escalation / Approval Alert Template
 */
export function renderOwnerAlertEmail(data: {
  ownerName: string;
  invoiceNumber: string;
  clientName: string;
  reason: string;
  summary: string;
  approvalsUrl: string;
}) {
  const escapedOwner = escapeHtml(data.ownerName);
  const escapedClient = escapeHtml(data.clientName);
  const escapedReason = escapeHtml(data.reason);
  const escapedSummary = escapeHtml(data.summary).replace(/\n/g, "<br />");
  const approvalsUrl = escapeHtml(data.approvalsUrl);

  const text = `Hi ${data.ownerName},

An action on Invoice #${data.invoiceNumber} (${data.clientName}) requires your review:

Reason: ${data.reason}
Summary: ${data.summary}

Review and approve/reject this request in your Amavi dashboard:
${data.approvalsUrl}

Best regards,
Amavi Autonomous Agent`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Action Required: Invoice #${escapeHtml(data.invoiceNumber)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 16px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="background-color: #b91c1c; padding: 20px 24px; color: #ffffff;">
      <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Action Required: Invoice Escalation</h2>
      <p style="margin: 4px 0 0; font-size: 13px; color: #fecaca;">Invoice #${escapeHtml(data.invoiceNumber)} &bull; ${escapedClient}</p>
    </div>
    <div style="padding: 24px;">
      <p style="margin-top: 0; font-size: 15px; line-height: 1.6;">Hi ${escapedOwner},</p>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 14px; margin: 16px 0; color: #991b1b; font-size: 14px;">
        <strong>Reason:</strong> ${escapedReason}
      </div>
      <div style="margin: 16px 0; font-size: 14px; color: #334155; line-height: 1.6;">
        <strong>Summary:</strong>
        <p style="margin: 6px 0 0;">${escapedSummary}</p>
      </div>
      <div style="margin: 28px 0;">
        <a href="${approvalsUrl}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; display: inline-block;">
          Open Approvals Queue &rarr;
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        Automated actions on this invoice are on hold until you approve or decline this request in the dashboard.
      </p>
    </div>
    <div style="background-color: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 12px; color: #64748b;">
      Amavi Guardrail &amp; Policy Enforcement System
    </div>
  </div>
</body>
</html>`;

  return { text, html };
}

