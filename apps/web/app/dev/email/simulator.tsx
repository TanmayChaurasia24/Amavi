"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InvoiceOption {
  id: string;
  paypalInvoiceId: string;
  clientName: string;
  clientEmail: string;
  replyToken: string | null;
}

export function MockEmailSimulator({ invoices }: { invoices: InvoiceOption[] }) {
  const router = useRouter();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(invoices[0]?.id || "");
  const [text, setText] = useState("I need to spread this across 3 monthly payments of $300.");
  const [scenario, setScenario] = useState<"standard" | "auto_reply" | "sender_mismatch">("standard");
  const [loading, setLoading] = useState(false);
  const [responseLog, setResponseLog] = useState<string | null>(null);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoiceId) return;

    setLoading(true);
    setResponseLog(null);

    try {
      const res = await fetch("/api/dev/mock-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          text,
          isAutoReply: scenario === "auto_reply",
          isMismatchedSender: scenario === "sender_mismatch",
          senderEmail: selectedInvoice?.clientEmail,
        }),
      });

      const data = await res.json();
      setResponseLog(JSON.stringify(data, null, 2));
      router.refresh();
    } catch (err) {
      setResponseLog(
        JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2)
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1.25rem", marginBottom: "2rem" }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.75rem 0", color: "#0f172a" }}>
        ⚡ Trigger Mock Inbound Email (Zero Network Required)
      </h3>
      <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1rem 0" }}>
        Simulates an incoming Resend webhook payload to verify guardrails, parsing, and owner escalation locally.
      </p>

      <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
              Target Invoice:
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            >
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  #{inv.paypalInvoiceId} &bull; {inv.clientName} ({inv.clientEmail})
                </option>
              ))}
            </select>
            {selectedInvoice?.replyToken && (
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                Reply Token: <code style={{ background: "#f1f5f9", padding: "1px 4px", borderRadius: "3px" }}>{selectedInvoice.replyToken}</code>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
              Scenario:
            </label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as any)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            >
              <option value="standard">Standard Client Reply (Installment / Proposal)</option>
              <option value="auto_reply">Out of Office / Auto-Reply (Verify Loop Prevention)</option>
              <option value="sender_mismatch">Sender Mismatch (Verify Fraud Escalation)</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
            Inbound Email Body:
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", fontFamily: "monospace" }}
            placeholder="Type debtor message here..."
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.5rem 1.25rem",
              background: loading ? "#94a3b8" : "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 500,
              fontSize: "0.85rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Simulating Webhook..." : "Send Mock Webhook & Refresh"}
          </button>
        </div>
      </form>

      {responseLog && (
        <div style={{ marginTop: "1rem", background: "#0f172a", color: "#38bdf8", padding: "0.75rem", borderRadius: "6px", fontSize: "0.75rem", overflowX: "auto" }}>
          <div style={{ color: "#94a3b8", marginBottom: "0.25rem" }}>Webhook Response:</div>
          <pre style={{ margin: 0 }}>{responseLog}</pre>
        </div>
      )}
    </div>
  );
}

