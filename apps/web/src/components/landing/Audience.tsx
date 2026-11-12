"use client";

const AUDIENCES = [
  {
    icon: "💻",
    title: "Freelance developers & designers",
    bullets: [
      "Project-based invoices that clients delay after delivery",
      "No HR or accounting team to chase payments",
      "Time is money — stop writing awkward follow-up emails",
    ],
    color: "#3b82f6",
  },
  {
    icon: "📸",
    title: "Creative professionals",
    bullets: [
      "Photographers, videographers, and copywriters with milestone payments",
      "Clients often dispute scope after delivery",
      "Need a paper trail if a dispute escalates",
    ],
    color: "#8b5cf6",
  },
  {
    icon: "🔧",
    title: "Consultants & agencies",
    bullets: [
      "Retainer and project invoices across multiple clients",
      "Need instalment plans for larger deals",
      "Want audit logs for compliance and client relations",
    ],
    color: "#06b6d4",
  },
  {
    icon: "🛠",
    title: "Small service businesses",
    bullets: [
      "Plumbers, contractors, IT support — anyone billing after work",
      "Clients who pay in parts are common and manageable",
      "One-person operation: automation is essential",
    ],
    color: "#10b981",
  },
];

export default function Audience() {
  return (
    <section
      id="audience"
      style={{
        padding: "120px 24px",
        background: "linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.03) 50%, transparent 100%)",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: "100px",
              padding: "4px 14px",
              fontSize: "12px",
              color: "#93c5fd",
              fontWeight: "600",
              marginBottom: "20px",
            }}
          >
            WHO IT&apos;S FOR
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
            If you invoice people,{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Amavi is for you
            </span>
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(244,244,245,0.55)", maxWidth: "480px", margin: "0 auto", lineHeight: "1.6" }}>
            Built for anyone who invoices through PayPal and spends time chasing late payments instead of doing their actual work.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
          }}
        >
          {AUDIENCES.map((a) => (
            <div
              key={a.title}
              style={{
                background: "rgba(17,17,22,0.7)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "16px",
                padding: "28px 24px",
                transition: "border-color 0.3s, transform 0.3s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${a.color}40`;
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: `${a.color}15`,
                  border: `1px solid ${a.color}25`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  marginBottom: "16px",
                }}
              >
                {a.icon}
              </div>

              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f4f4f5", marginBottom: "14px", lineHeight: "1.3" }}>
                {a.title}
              </h3>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                {a.bullets.map((b) => (
                  <li key={b} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <span style={{ color: a.color, flexShrink: 0, marginTop: "1px", fontSize: "12px" }}>→</span>
                    <span style={{ fontSize: "13px", color: "rgba(244,244,245,0.55)", lineHeight: "1.5" }}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
