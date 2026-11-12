import { env } from "@/lib/env";
import { MockEmailSimulator } from "./simulator";

export const dynamic = "force-dynamic";

async function getEmailDevData() {
  const { db } = await import("@/db");
  const { messages, invoices, clients } = await import("@/db/schema");
  const { desc, eq } = await import("drizzle-orm");

  const emailMessages = await db
    .select({
      id: messages.id,
      invoiceId: messages.invoiceId,
      direction: messages.direction,
      sender: messages.sender,
      content: messages.content,
      channel: messages.channel,
      externalId: messages.externalId,
      ignoredReason: messages.ignoredReason,
      deliveryStatus: messages.deliveryStatus,
      createdAt: messages.createdAt,
      paypalInvoiceId: invoices.paypalInvoiceId,
      replyToken: invoices.replyToken,
      clientName: clients.name,
      clientEmail: clients.email,
    })
    .from(messages)
    .leftJoin(invoices, eq(messages.invoiceId, invoices.id))
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(messages.channel, "email"))
    .orderBy(desc(messages.createdAt))
    .limit(20);

  const activeInvoices = await db.query.invoices.findMany({
    with: { client: true },
    limit: 30,
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
  });

  return { emailMessages, activeInvoices };
}

export default async function DevEmailPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <div style={{ fontFamily: "monospace", padding: "2rem" }}>
        <h1>403 – Dev page disabled in production</h1>
      </div>
    );
  }

  let data: Awaited<ReturnType<typeof getEmailDevData>> | null = null;
  let dbError: string | null = null;

  try {
    data = await getEmailDevData();
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const invoiceOptions =
    data?.activeInvoices.map((inv) => ({
      id: inv.id,
      paypalInvoiceId: inv.paypalInvoiceId,
      clientName: inv.client?.name ?? "Unknown Client",
      clientEmail: inv.client?.email ?? "unknown@example.com",
      replyToken: inv.replyToken,
    })) ?? [];

  return (
    <div style={{ fontFamily: "monospace", padding: "1.5rem", maxWidth: "1200px", margin: "0 auto", color: "#1e293b", fontSize: "13px" }}>
      <div style={{ marginBottom: "1.5rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
          📬 Amavi Email Channel Debugger &amp; Audit Log
        </h1>
        <p style={{ margin: 0, color: "#64748b" }}>
          Channel Status:{" "}
          <strong style={{ color: env.EMAIL_CHANNEL_ENABLED ? "#16a34a" : "#dc2626" }}>
            {env.EMAIL_CHANNEL_ENABLED ? "LIVE (Outbound Dispatched)" : "DISABLED (Simulation Mode)"}
          </strong>{" "}
          &bull; Inbound Domain: <code>{env.INBOUND_EMAIL_DOMAIN}</code> &bull; Daily Cap:{" "}
          <code>{env.MAX_AGENT_REPLIES_PER_INVOICE_PER_DAY} replies/invoice/24h</code>
        </p>
      </div>

      {dbError && (
        <div style={{ background: "#fee2e2", border: "1px solid #f87171", color: "#991b1b", padding: "1rem", borderRadius: "6px", marginBottom: "1.5rem" }}>
          <strong>Database Connection Error:</strong> {dbError}
        </div>
      )}

      {/* Simulator Component */}
      <MockEmailSimulator invoices={invoiceOptions} />

      {/* Audit Log Table */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem", color: "#0f172a" }}>
          Last 20 Email Channel Messages
        </h2>
        {(!data?.emailMessages || data.emailMessages.length === 0) ? (
          <div style={{ background: "#f8fafc", padding: "1.5rem", border: "1px solid #e2e8f0", borderRadius: "6px", color: "#64748b", textAlign: "center" }}>
            No email messages recorded yet. Use the simulator above or send an email to generate activity.
          </div>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#ffffff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "12px" }}>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Time</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Direction</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Status</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Invoice</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Sender / Recipient</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Content</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Ignored / Escalated Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.emailMessages.map((msg) => {
                  const isOutbound = msg.direction === "OUTBOUND";
                  const statusColors: Record<string, { bg: string; color: string }> = {
                    delivered: { bg: "#dcfce7", color: "#166534" },
                    sent: { bg: "#e0f2fe", color: "#0369a1" },
                    ignored: { bg: "#fef3c7", color: "#92400e" },
                    escalated: { bg: "#fee2e2", color: "#991b1b" },
                    failed: { bg: "#fee2e2", color: "#991b1b" },
                  };
                  const badge = statusColors[msg.deliveryStatus] || { bg: "#f1f5f9", color: "#475569" };

                  return (
                    <tr key={msg.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.6rem 0.8rem", whiteSpace: "nowrap", color: "#64748b" }}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: "0.6rem 0.8rem", whiteSpace: "nowrap" }}>
                        <span style={{
                          fontWeight: 600,
                          color: isOutbound ? "#2563eb" : "#059669",
                        }}>
                          {msg.direction}
                        </span>
                      </td>
                      <td style={{ padding: "0.6rem 0.8rem", whiteSpace: "nowrap" }}>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: badge.bg,
                          color: badge.color,
                        }}>
                          {msg.deliveryStatus}
                        </span>
                      </td>
                      <td style={{ padding: "0.6rem 0.8rem", whiteSpace: "nowrap" }}>
                        <a href={`/dashboard/invoices/${msg.invoiceId}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                          #{msg.paypalInvoiceId ?? msg.invoiceId?.slice(0, 8)}
                        </a>
                      </td>
                      <td style={{ padding: "0.6rem 0.8rem", whiteSpace: "nowrap" }}>
                        {msg.sender}
                      </td>
                      <td style={{ padding: "0.6rem 0.8rem", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {msg.content}
                      </td>
                      <td style={{ padding: "0.6rem 0.8rem", color: msg.ignoredReason ? "#b91c1c" : "#94a3b8" }}>
                        {msg.ignoredReason || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Local Testing Documentation */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem 0", color: "#0f172a" }}>
          📖 How to Test the Email Channel Locally
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b", margin: "0 0 0.4rem 0" }}>
              Method 1: Resend CLI (Managed Domain)
            </h3>
            <p style={{ margin: "0 0 0.5rem 0", color: "#64748b" }}>
              Send an email to your webhook using Resend's CLI or curl through the Resend API:
            </p>
            <pre style={{ background: "#0f172a", color: "#f8fafc", padding: "0.75rem", borderRadius: "6px", overflowX: "auto" }}>
              {`resend emails send \\
  --from "Client <client@example.com>" \\
  --to "reply+{REPLY_TOKEN}@${env.INBOUND_EMAIL_DOMAIN}" \\
  --subject "Re: Invoice #1024" \\
  --text "Can I make 3 monthly payments of $200?"`}
            </pre>
          </div>

          <div>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b", margin: "0 0 0.4rem 0" }}>
              Method 2: ngrok Tunnel to Local Webhook
            </h3>
            <p style={{ margin: "0 0 0.5rem 0", color: "#64748b" }}>
              Forward inbound webhook events from Resend directly to your local Next.js dev server:
            </p>
            <pre style={{ background: "#0f172a", color: "#f8fafc", padding: "0.75rem", borderRadius: "6px", overflowX: "auto" }}>
              {`# 1. Start tunnel
ngrok http 3000

# 2. In Resend Dashboard > Webhooks, add endpoint:
https://<your-ngrok-subdomain>.ngrok-free.app/api/webhooks/email
Event: email.received`}
            </pre>
          </div>

          <div>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b", margin: "0 0 0.4rem 0" }}>
              Method 3: Direct curl Command with Mock Webhook
            </h3>
            <p style={{ margin: "0 0 0.5rem 0", color: "#64748b" }}>
              POST directly to <code>/api/dev/mock-email</code> or <code>/api/webhooks/email</code>:
            </p>
            <pre style={{ background: "#0f172a", color: "#f8fafc", padding: "0.75rem", borderRadius: "6px", overflowX: "auto" }}>
              {`curl -X POST http://localhost:3000/api/dev/mock-email \\
  -H "Content-Type: application/json" \\
  -d '{
    "invoiceId": "${invoiceOptions[0]?.id || "YOUR_INVOICE_ID"}",
    "text": "I can pay a $300 deposit today and the rest next month.",
    "isAutoReply": false
  }'`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

