"use client";

import { useState } from "react";
import Link from "next/link";

const PLANS = [
  {
    id: "solo",
    name: "Solo",
    price: "$0",
    period: "/month",
    note: "Free during beta",
    description: "For freelancers just getting started. Full feature access, no credit card required.",
    features: [
      "Up to 10 active invoices",
      "All 4 AI intent classes",
      "Guardrail configuration",
      "PayPal sandbox + live",
      "Audit trail (30 days)",
      "Email escalations",
    ],
    cta: "Start free",
    ctaHref: "/demo",
    featured: false,
    color: "#94a3b8",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/month",
    note: "Most popular",
    description: "For active freelancers and small studios handling multiple clients at once.",
    features: [
      "Unlimited active invoices",
      "Priority agent processing",
      "Audit trail (1 year)",
      "Webhook reliability monitor",
      "Slack / email escalations",
      "API access",
    ],
    cta: "Get early access",
    ctaHref: "/demo",
    featured: true,
    color: "#3b82f6",
  },
  {
    id: "agency",
    name: "Agency",
    price: "$99",
    period: "/month",
    note: "For teams",
    description: "For agencies managing collections across multiple clients and team members.",
    features: [
      "Everything in Pro",
      "Up to 5 team seats",
      "Custom guardrail profiles per client",
      "SSO & audit export",
      "Dedicated support",
      "SLA guarantee",
    ],
    cta: "Contact us",
    ctaHref: "/demo",
    featured: false,
    color: "#8b5cf6",
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section
      id="pricing"
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
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: "100px",
            padding: "4px 14px",
            fontSize: "12px",
            color: "#fcd34d",
            fontWeight: "600",
            marginBottom: "20px",
          }}
        >
          PRICING
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
          Simple,{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #f59e0b, #f43f5e)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            transparent pricing
          </span>
        </h2>
        <p style={{ fontSize: "16px", color: "rgba(244,244,245,0.55)", maxWidth: "420px", margin: "0 auto 32px", lineHeight: "1.6" }}>
          No success fees. No per-invoice charges. A flat monthly rate so your cost never surprises you.
        </p>

        {/* Toggle */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "100px", padding: "4px 6px" }}>
          <button
            onClick={() => setAnnual(false)}
            style={{
              padding: "7px 18px",
              borderRadius: "100px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              background: !annual ? "rgba(255,255,255,0.1)" : "transparent",
              color: !annual ? "#f4f4f5" : "rgba(244,244,245,0.5)",
              transition: "all 0.2s",
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            style={{
              padding: "7px 18px",
              borderRadius: "100px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              background: annual ? "rgba(255,255,255,0.1)" : "transparent",
              color: annual ? "#f4f4f5" : "rgba(244,244,245,0.5)",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Annual
            <span style={{ fontSize: "10px", background: "rgba(16,185,129,0.2)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "4px", padding: "1px 5px" }}>
              save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          alignItems: "start",
        }}
        className="pricing-grid"
      >
        {PLANS.map((plan) => {
          const price =
            plan.price === "$0"
              ? "$0"
              : annual
              ? `$${Math.round(parseInt(plan.price.replace("$", "")) * 0.8)}`
              : plan.price;

          return (
            <div
              key={plan.id}
              style={{
                background: plan.featured ? "rgba(59,130,246,0.08)" : "rgba(17,17,22,0.7)",
                border: plan.featured ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(255,255,255,0.07)",
                borderRadius: "20px",
                padding: "32px 28px",
                position: "relative",
                transform: plan.featured ? "scale(1.03)" : "scale(1)",
                boxShadow: plan.featured ? "0 24px 64px -16px rgba(59,130,246,0.25)" : "none",
              }}
            >
              {plan.featured && (
                <div
                  style={{
                    position: "absolute",
                    top: "-12px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "4px 16px",
                    borderRadius: "100px",
                    letterSpacing: "0.05em",
                  }}
                >
                  MOST POPULAR
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: plan.color, marginBottom: "4px" }}>
                  {plan.name}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span style={{ fontSize: "40px", fontWeight: "800", color: "#f4f4f5", letterSpacing: "-0.03em" }}>
                    {price}
                  </span>
                  <span style={{ fontSize: "14px", color: "rgba(244,244,245,0.4)" }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: "11px", color: plan.featured ? "#93c5fd" : "rgba(244,244,245,0.35)", marginTop: "4px" }}>
                  {plan.note}
                </div>
              </div>

              <p style={{ fontSize: "13px", color: "rgba(244,244,245,0.5)", lineHeight: "1.5", marginBottom: "24px" }}>
                {plan.description}
              </p>

              <Link
                href={plan.ctaHref}
                id={`pricing-cta-${plan.id}`}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "11px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "700",
                  marginBottom: "24px",
                  background: plan.featured ? "linear-gradient(135deg, #3b82f6, #06b6d4)" : "rgba(255,255,255,0.06)",
                  color: plan.featured ? "#fff" : "rgba(244,244,245,0.8)",
                  border: plan.featured ? "none" : "1px solid rgba(255,255,255,0.1)",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {plan.cta}
              </Link>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "9px" }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <span style={{ color: plan.featured ? "#3b82f6" : "#10b981", flexShrink: 0, fontSize: "13px" }}>✓</span>
                    <span style={{ fontSize: "13px", color: "rgba(244,244,245,0.6)" }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: "center", marginTop: "40px", fontSize: "12px", color: "rgba(244,244,245,0.3)" }}>
        All plans include PayPal sandbox access for testing. Pricing is indicative — Settle is in public beta.
      </p>
    </section>
  );
}
