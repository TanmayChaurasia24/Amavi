"use client";

const TABS = [
  {
    id: "dashboard",
    label: "📊 Dashboard",
    title: "Risk portfolio at a glance",
    description: "AG Grid-powered invoice table with colour-coded risk badges, overdue days, and one-click audit trails for every AI decision.",
    preview: (
      <div style={{ padding: "20px" }}>
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 0.8fr",
            gap: "0",
            background: "rgba(18,20,28,0.8)",
            borderRadius: "8px 8px 0 0",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            padding: "10px 16px",
          }}
        >
          {["Client", "Amount", "Due date", "Status", "Risk", "Actions"].map((h) => (
            <div key={h} style={{ fontSize: "10px", fontWeight: "700", color: "rgba(244,244,245,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {h}
            </div>
          ))}
        </div>
        {[
          { client: "Meridian Design Co.", amount: "$4,200", due: "23d ago", status: "OVERDUE", statusColor: "#f43f5e", risk: "HIGH", riskColor: "#f43f5e" },
          { client: "Hyperion Robotics Inc.", amount: "$2,400", due: "8d ago", status: "NEGOTIATING", statusColor: "#f59e0b", risk: "MED", riskColor: "#f59e0b" },
          { client: "Slate & Sons Ltd.", amount: "$890", due: "In 14d", status: "OPEN", statusColor: "#94a3b8", risk: "LOW", riskColor: "#10b981" },
          { client: "Vega Creative Agency", amount: "$6,100", due: "45d ago", status: "PART PAID", statusColor: "#06b6d4", risk: "MED", riskColor: "#f59e0b" },
        ].map((row, i) => (
          <div
            key={row.client}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 0.8fr",
              gap: "0",
              padding: "11px 16px",
              background: i % 2 === 0 ? "rgba(14,15,22,0.6)" : "rgba(17,18,26,0.6)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: "500" }}>{row.client}</div>
            <div style={{ fontSize: "12px", color: "#f4f4f5", fontWeight: "700" }}>{row.amount}</div>
            <div style={{ fontSize: "11px", color: "rgba(244,244,245,0.5)" }}>{row.due}</div>
            <div>
              <span style={{ fontSize: "10px", fontWeight: "700", color: row.statusColor, background: `${row.statusColor}15`, border: `1px solid ${row.statusColor}30`, borderRadius: "4px", padding: "2px 7px" }}>
                {row.status}
              </span>
            </div>
            <div>
              <span style={{ fontSize: "10px", fontWeight: "700", color: row.riskColor, background: `${row.riskColor}15`, border: `1px solid ${row.riskColor}30`, borderRadius: "4px", padding: "2px 7px" }}>
                {row.risk}
              </span>
            </div>
            <div>
              <button style={{ fontSize: "10px", color: "#3b82f6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "4px", padding: "3px 8px", cursor: "pointer" }}>
                Audit ↗
              </button>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "approvals",
    label: "✅ Approvals",
    title: "Escalations in one place",
    description: "Disputes, hardship claims, and out-of-bounds proposals land here. Approve or reject with one click — or add a note before deciding.",
    preview: (
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {[
          {
            client: "Meridian Design Co.",
            amount: "$4,200",
            proposal: "Client requests 50% discount due to project scope dispute.",
            reason: "Discount (50%) exceeds max_discount (0%). Escalated automatically.",
            badge: "DISPUTE",
            badgeColor: "#f43f5e",
          },
          {
            client: "Apex Ventures LLC",
            amount: "$9,800",
            proposal: "Client proposes 5% deposit ($490) and 12 monthly instalments.",
            reason: "Deposit (5%) below min_deposit (30%). Instalments (12) exceed max (3).",
            badge: "INSTALMENT",
            badgeColor: "#f59e0b",
          },
        ].map((item) => (
          <div
            key={item.client}
            style={{
              background: "rgba(17,17,22,0.7)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px",
              padding: "18px 20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#f4f4f5" }}>{item.client}</div>
                <div style={{ fontSize: "11px", color: "rgba(244,244,245,0.4)" }}>{item.amount} outstanding</div>
              </div>
              <span style={{ fontSize: "9px", fontWeight: "700", color: item.badgeColor, background: `${item.badgeColor}15`, border: `1px solid ${item.badgeColor}25`, borderRadius: "4px", padding: "3px 8px" }}>
                {item.badge}
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "rgba(244,244,245,0.6)", marginBottom: "8px", lineHeight: "1.5" }}>
              &ldquo;{item.proposal}&rdquo;
            </p>
            <p style={{ fontSize: "11px", color: "rgba(244,63,94,0.7)", marginBottom: "14px" }}>
              ⚠ {item.reason}
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ flex: 1, padding: "7px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", color: "#10b981", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                ✓ Approve
              </button>
              <button style={{ flex: 1, padding: "7px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "6px", color: "#f43f5e", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                ✗ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "audit",
    label: "🔍 Audit Trail",
    title: "Full AI reasoning trace",
    description: "Every decision logged with input payloads, guardrail results, and output actions. Nothing happens without a traceable reason.",
    preview: (
      <div style={{ padding: "20px", fontFamily: "monospace", fontSize: "12px" }}>
        {[
          { time: "4d ago", ms: "45ms", icon: "👤", label: "OWNER APPROVED", color: "#10b981", detail: "Owner approved: Verified by owner" },
          { time: "4d ago", ms: "82ms", icon: "🛡", label: "GUARDRAILS EVALUATED", color: "#f43f5e", detail: "FAILED: deposit 15% < min 30%. Duration 120d > max 60d." },
          { time: "4d ago", ms: "1.2s", icon: "🤖", label: "INTENT CLASSIFIED", color: "#3b82f6", detail: "REQUEST_INSTALMENT — confidence 0.97\nAmount: $360 deposit, 4 × monthly" },
          { time: "4d ago", ms: "380ms", icon: "📬", label: "CLIENT MESSAGE RECEIVED", color: "#06b6d4", detail: "\"Can I pay 15% now and the rest over 4 months?\"" },
        ].map((entry) => (
          <div key={entry.label} style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `${entry.color}15`, border: `1px solid ${entry.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                {entry.icon}
              </div>
              <div style={{ width: "1px", flex: 1, background: "rgba(255,255,255,0.05)", minHeight: "20px" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", fontWeight: "700", color: entry.color }}>{entry.label}</span>
                <span style={{ fontSize: "9px", color: "rgba(244,244,245,0.3)" }}>{entry.ms}</span>
                <span style={{ fontSize: "9px", color: "rgba(244,244,245,0.3)" }}>{entry.time}</span>
              </div>
              <div style={{ fontSize: "11px", color: "rgba(244,244,245,0.55)", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>{entry.detail}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

export default function ProductPreview() {
  return (
    <section
      id="product"
      style={{
        padding: "120px 24px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "64px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "100px",
            padding: "4px 14px",
            fontSize: "12px",
            color: "#6ee7b7",
            fontWeight: "600",
            marginBottom: "20px",
          }}
        >
          PRODUCT PREVIEW
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
          Built for clarity,{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            not complexity
          </span>
        </h2>
        <p style={{ fontSize: "16px", color: "rgba(244,244,245,0.55)", maxWidth: "480px", margin: "0 auto", lineHeight: "1.6" }}>
          Three views cover everything you need to manage collections.
        </p>
      </div>

      {/* Tab panels */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {TABS.map((tab) => (
          <div key={tab.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px", alignItems: "start" }} className="product-tab-row">
            {/* Description */}
            <div style={{ paddingTop: "20px" }}>
              <div
                style={{
                  display: "inline-flex",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  color: "rgba(244,244,245,0.6)",
                  fontWeight: "600",
                  marginBottom: "14px",
                }}
              >
                {tab.label}
              </div>
              <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#f4f4f5", marginBottom: "12px", letterSpacing: "-0.02em" }}>
                {tab.title}
              </h3>
              <p style={{ fontSize: "14px", color: "rgba(244,244,245,0.55)", lineHeight: "1.65" }}>
                {tab.description}
              </p>
            </div>

            {/* Preview */}
            <div
              style={{
                background: "rgba(12,12,18,0.8)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 24px 64px -16px rgba(0,0,0,0.5)",
              }}
            >
              {/* Window chrome */}
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(17,17,22,0.5)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                  <div key={c} style={{ width: "9px", height: "9px", borderRadius: "50%", background: c }} />
                ))}
                <span style={{ fontSize: "11px", color: "rgba(244,244,245,0.3)", marginLeft: "8px", fontFamily: "monospace" }}>
                  amavi.app/{tab.id}
                </span>
              </div>
              {tab.preview}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
