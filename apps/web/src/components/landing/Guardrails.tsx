"use client";

import { useState } from "react";

const GUARDRAILS = [
  {
    id: "min_deposit",
    label: "Minimum upfront deposit",
    description: "Client must pay at least this % of the outstanding balance before the plan starts.",
    unit: "%",
    default: 30,
    min: 10,
    max: 100,
    color: "#3b82f6",
  },
  {
    id: "max_duration",
    label: "Maximum plan duration",
    description: "Instalment plans cannot stretch beyond this many days.",
    unit: "days",
    default: 60,
    min: 7,
    max: 365,
    color: "#06b6d4",
  },
  {
    id: "max_instalments",
    label: "Maximum number of instalments",
    description: "The most instalments Settle can offer without escalating to you.",
    unit: "",
    default: 3,
    min: 1,
    max: 12,
    color: "#8b5cf6",
  },
  {
    id: "max_discount",
    label: "Maximum discount allowed",
    description: "Settle can offer up to this % discount autonomously. Anything more creates an approval ticket.",
    unit: "%",
    default: 0,
    min: 0,
    max: 50,
    color: "#10b981",
  },
];

function GuardrailSlider({
  guardrail,
  value,
  onChange,
}: {
  guardrail: (typeof GUARDRAILS)[0];
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - guardrail.min) / (guardrail.max - guardrail.min)) * 100;

  return (
    <div
      style={{
        background: "rgba(17,17,22,0.7)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding: "22px 24px",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${guardrail.color}35`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#f4f4f5", marginBottom: "4px" }}>
            {guardrail.label}
          </div>
          <div style={{ fontSize: "12px", color: "rgba(244,244,245,0.45)", lineHeight: "1.4", maxWidth: "380px" }}>
            {guardrail.description}
          </div>
        </div>
        <div
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: guardrail.color,
            letterSpacing: "-0.02em",
            minWidth: "80px",
            textAlign: "right",
          }}
        >
          {value}{guardrail.unit}
        </div>
      </div>

      <div style={{ position: "relative", height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.08)", marginTop: "16px" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            borderRadius: "3px",
            background: `linear-gradient(90deg, ${guardrail.color}aa, ${guardrail.color})`,
            transition: "width 0.1s",
          }}
        />
        <input
          type="range"
          min={guardrail.min}
          max={guardrail.max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: "100%",
            transform: "translateY(-50%)",
            appearance: "none",
            WebkitAppearance: "none",
            background: "transparent",
            cursor: "pointer",
            height: "20px",
            margin: 0,
          }}
          aria-label={guardrail.label}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
        <span style={{ fontSize: "10px", color: "rgba(244,244,245,0.3)" }}>{guardrail.min}{guardrail.unit}</span>
        <span style={{ fontSize: "10px", color: "rgba(244,244,245,0.3)" }}>{guardrail.max}{guardrail.unit}</span>
      </div>
    </div>
  );
}

export default function Guardrails() {
  const [values, setValues] = useState(
    Object.fromEntries(GUARDRAILS.map((g) => [g.id, g.default]))
  );
  const [saved, setSaved] = useState(false);

  const handleChange = (id: string, v: number) => {
    setValues((prev) => ({ ...prev, [id]: v }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section
      id="guardrails"
      style={{
        padding: "120px 24px",
        background: "linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.03) 50%, transparent 100%)",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "80px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "100px",
              padding: "4px 14px",
              fontSize: "12px",
              color: "#c4b5fd",
              fontWeight: "600",
              marginBottom: "20px",
            }}
          >
            SAFETY &amp; GUARDRAILS
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
            You set the rules.{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              AI stays in bounds.
            </span>
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "rgba(244,244,245,0.55)",
              maxWidth: "560px",
              lineHeight: "1.6",
            }}
          >
            Server-side guardrails — not AI judgement — decide whether a plan is accepted. The model proposes; code validates. Drag the sliders below to see how limits work.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
          }}
          className="guardrails-grid"
        >
          {/* Left: interactive sliders */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px rgba(16,185,129,0.6)",
                }}
              />
              <span style={{ fontSize: "13px", color: "rgba(244,244,245,0.6)", fontWeight: "500" }}>
                Interactive demo — drag to try your own limits
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
              {GUARDRAILS.map((g) => (
                <GuardrailSlider
                  key={g.id}
                  guardrail={g}
                  value={values[g.id]!}
                  onChange={(v) => handleChange(g.id, v)}
                />
              ))}
            </div>

            <button
              onClick={handleSave}
              style={{
                width: "100%",
                padding: "13px",
                background: saved
                  ? "rgba(16,185,129,0.2)"
                  : "linear-gradient(135deg, #3b82f6, #06b6d4)",
                border: saved ? "1px solid rgba(16,185,129,0.4)" : "none",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              {saved ? "✓ Guardrails saved!" : "Save guardrail configuration"}
            </button>
          </div>

          {/* Right: live validation preview */}
          <div>
            <div
              style={{
                background: "rgba(12,12,18,0.8)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "16px",
                overflow: "hidden",
                height: "100%",
                minHeight: "400px",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(17,17,22,0.5)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                <span style={{ fontSize: "12px", color: "rgba(244,244,245,0.5)", fontFamily: "monospace" }}>
                  agent validation trace
                </span>
              </div>

              <div style={{ padding: "20px", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.8" }}>
                <div style={{ color: "rgba(244,244,245,0.3)" }}>// client proposal</div>
                <div style={{ color: "#e2e8f0", marginBottom: "16px" }}>
                  {`{ deposit: 25%, duration: 90d, instalments: 4 }`}
                </div>

                <div style={{ color: "rgba(244,244,245,0.3)" }}>// guardrail checks</div>
                {[
                  {
                    label: `deposit (25%) ≥ min_deposit (${values.min_deposit}%)`,
                    pass: 25 >= values.min_deposit!,
                  },
                  {
                    label: `duration (90d) ≤ max_duration (${values.max_duration}d)`,
                    pass: 90 <= values.max_duration!,
                  },
                  {
                    label: `instalments (4) ≤ max_instalments (${values.max_instalments})`,
                    pass: 4 <= values.max_instalments!,
                  },
                  {
                    label: `discount (0%) ≤ max_discount (${values.max_discount}%)`,
                    pass: 0 <= values.max_discount!,
                  },
                ].map((check) => (
                  <div key={check.label} style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                    <span style={{ color: check.pass ? "#10b981" : "#f43f5e" }}>
                      {check.pass ? "✓" : "✗"}
                    </span>
                    <span style={{ color: check.pass ? "rgba(244,244,245,0.7)" : "rgba(244,63,94,0.8)" }}>
                      {check.label}
                    </span>
                  </div>
                ))}

                <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {[25 >= values.min_deposit!, 90 <= values.max_duration!, 4 <= values.max_instalments!, 0 <= values.max_discount!].every(Boolean) ? (
                    <div
                      style={{
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.25)",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        color: "#10b981",
                        fontSize: "13px",
                        fontFamily: "inherit",
                      }}
                    >
                      ✓ APPROVED — creating PayPal instalment plan...
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "rgba(244,63,94,0.08)",
                        border: "1px solid rgba(244,63,94,0.2)",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        color: "#f43f5e",
                        fontSize: "13px",
                        fontFamily: "inherit",
                      }}
                    >
                      ✗ ESCALATED — creating owner approval ticket
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
