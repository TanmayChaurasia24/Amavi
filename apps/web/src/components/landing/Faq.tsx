"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Does my client need to create a Amavi account?",
    a: "No. Amavi sends the client a standard PayPal payment link. They pay through PayPal as usual — no account or signup required on their end.",
  },
  {
    q: "Can Amavi give a discount without my approval?",
    a: "Only if you explicitly allow it. The max_discount guardrail defaults to 0%. Any proposal for a discount above that limit creates an escalation ticket and waits for your explicit approval before anything happens.",
  },
  {
    q: "Does PayPal support native instalment schedules?",
    a: "Not through the Invoicing API. Amavi simulates instalment plans by enabling partial payment and setting a minimum_amount_due (the deposit) in PayPal. Our database tracks the full plan and advances it as each payment arrives via webhook.",
  },
  {
    q: "What if the client tries to manipulate the AI?",
    a: "Client messages are treated as untrusted input. Prompt injection attempts are detected and blocked before any PayPal action is taken. The guardrail validation runs in server-side code — not inside the AI — so even a successful injection only produces a proposal the code will reject.",
  },
  {
    q: "What happens when the client misses an instalment?",
    a: "Amavi automatically sends a PayPal reminder and logs the missed payment in the audit trail. If you've enabled escalation on missed instalments, it creates an approval ticket. You decide the next step — another reminder, a new plan, or escalation to collections.",
  },
  {
    q: "Is my PayPal data secure?",
    a: "Amavi uses PayPal's official OAuth 2.0 REST API with sandbox isolation. We never store your PayPal Client Secret in the database — only in server-side environment variables. Webhook authenticity is verified using PayPal's signature verification API on every event.",
  },
  {
    q: "Which PayPal products does Amavi use?",
    a: "Amavi uses the PayPal Invoicing REST API (v2/invoicing/invoices), the webhook event delivery system, the verify-webhook-signature endpoint, and the PayPal Agent Toolkit for Vercel AI SDK.",
  },
  {
    q: "Can I use Amavi with live PayPal (not just sandbox)?",
    a: "Sandbox is required during beta. Live PayPal support is planned for the Pro tier at general availability. The architecture is already designed for it — changing PAYPAL_ENVIRONMENT to LIVE in your env is all that changes.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="faq"
      style={{
        padding: "120px 24px",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "64px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(244,63,94,0.1)",
            border: "1px solid rgba(244,63,94,0.2)",
            borderRadius: "100px",
            padding: "4px 14px",
            fontSize: "12px",
            color: "#fda4af",
            fontWeight: "600",
            marginBottom: "20px",
          }}
        >
          FAQ
        </div>
        <h2
          style={{
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: "800",
            color: "#f4f4f5",
            letterSpacing: "-0.03em",
            lineHeight: "1.1",
          }}
        >
          Common questions
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {FAQS.map((faq, i) => (
          <div
            key={i}
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <button
              id={`faq-${i}`}
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "22px 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                textAlign: "left",
              }}
              aria-expanded={open === i}
            >
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  color: open === i ? "#f4f4f5" : "rgba(244,244,245,0.8)",
                  lineHeight: "1.4",
                  transition: "color 0.2s",
                }}
              >
                {faq.q}
              </span>
              <span
                style={{
                  fontSize: "20px",
                  color: open === i ? "#3b82f6" : "rgba(244,244,245,0.4)",
                  flexShrink: 0,
                  transition: "transform 0.25s, color 0.2s",
                  transform: open === i ? "rotate(45deg)" : "rotate(0deg)",
                  display: "inline-block",
                }}
              >
                +
              </span>
            </button>

            <div
              style={{
                maxHeight: open === i ? "400px" : "0",
                overflow: "hidden",
                transition: "max-height 0.35s ease",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(244,244,245,0.55)",
                  lineHeight: "1.7",
                  paddingBottom: "22px",
                }}
              >
                {faq.a}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
