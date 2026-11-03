"use client";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: "🔗",
      title: "Connect PayPal once",
      description:
        "Sign up with your PayPal sandbox account and set your rules: maximum instalments, minimum deposit percentage, maximum duration, and discount ceiling. Takes under two minutes.",
      color: "#3b82f6",
    },
    {
      number: "02",
      icon: "📬",
      title: "Client replies to an overdue invoice",
      description:
        "A client emails or messages back with a payment proposal. Settle reads the reply, classifies the intent — instalment request, promise to pay, dispute, or hardship — and extracts the offer.",
      color: "#06b6d4",
    },
    {
      number: "03",
      icon: "🤖",
      title: "Agent validates against your guardrails",
      description:
        "Server-side code (not the AI) checks the proposal against your rules. The model proposes; code decides. Prompt injection attempts are detected and blocked before they reach PayPal.",
      color: "#8b5cf6",
    },
    {
      number: "04",
      icon: "💳",
      title: "PayPal plan created automatically",
      description:
        "If the offer fits the rules, Settle enables partial payment on the invoice, sets the minimum deposit amount and new due date in PayPal, and sends the client a payment link — no manual work.",
      color: "#10b981",
    },
    {
      number: "05",
      icon: "⚡",
      title: "Webhooks reconcile payments in real time",
      description:
        "PayPal fires events when the deposit arrives. Settle verifies the webhook signature, updates the instalment plan, and advances to the next instalment — or marks the invoice paid.",
      color: "#f59e0b",
    },
    {
      number: "06",
      icon: "🚨",
      title: "Edge cases escalate to you",
      description:
        "Disputes, hardship claims, or offers outside your rules create an approval ticket — not a PayPal action. You approve or reject from the dashboard. Nothing happens until you say so.",
      color: "#f43f5e",
    },
  ];

  return (
    <section
      id="how-it-works"
      style={{
        padding: "120px 24px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: "80px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(6,182,212,0.1)",
            border: "1px solid rgba(6,182,212,0.2)",
            borderRadius: "100px",
            padding: "4px 14px",
            fontSize: "12px",
            color: "#67e8f9",
            fontWeight: "600",
            marginBottom: "20px",
          }}
        >
          HOW IT WORKS
        </div>
        <h2
          style={{
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: "800",
            color: "#f4f4f5",
            letterSpacing: "-0.03em",
            lineHeight: "1.1",
            marginBottom: "16px",
          }}
        >
          From overdue to{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            resolved
          </span>
          , automatically
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "rgba(244,244,245,0.55)",
            maxWidth: "520px",
            margin: "0 auto",
            lineHeight: "1.6",
          }}
        >
          Six steps from late invoice to collected payment — most happen with zero input from you.
        </p>
      </div>

      {/* Steps grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
        }}
      >
        {steps.map((step, i) => (
          <div
            key={step.number}
            style={{
              background: "rgba(17,17,22,0.7)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              padding: "28px",
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.3s, transform 0.3s",
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = `${step.color}40`;
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
            }}
          >
            {/* Top glow */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "2px",
                background: `linear-gradient(90deg, transparent, ${step.color}60, transparent)`,
              }}
            />

            {/* Step number + icon */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: step.color,
                  letterSpacing: "0.08em",
                  fontFamily: "monospace",
                }}
              >
                {step.number}
              </span>
              <span
                style={{
                  fontSize: "24px",
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: `${step.color}15`,
                  border: `1px solid ${step.color}25`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {step.icon}
              </span>
            </div>

            <h3
              style={{
                fontSize: "17px",
                fontWeight: "700",
                color: "#f4f4f5",
                marginBottom: "10px",
                letterSpacing: "-0.01em",
              }}
            >
              {step.title}
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "rgba(244,244,245,0.55)",
                lineHeight: "1.65",
              }}
            >
              {step.description}
            </p>

            {/* Connector arrow */}
            {i < steps.length - 1 && i % 3 !== 2 && (
              <div
                style={{
                  position: "absolute",
                  right: "-13px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  color: "rgba(255,255,255,0.1)",
                  zIndex: 2,
                }}
              >
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
