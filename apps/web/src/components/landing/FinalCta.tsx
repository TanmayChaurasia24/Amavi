"use client";

import Link from "next/link";

export default function FinalCta() {
  return (
    <section
      style={{
        padding: "0 24px 120px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: "24px",
          overflow: "hidden",
          background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.08), rgba(139,92,246,0.12))",
          border: "1px solid rgba(59,130,246,0.2)",
          padding: "80px 48px",
          textAlign: "center",
        }}
      >
        {/* Glow orbs */}
        <div
          style={{
            position: "absolute",
            top: "-40%",
            left: "20%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-40%",
            right: "15%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: "100px",
              padding: "5px 16px",
              fontSize: "12px",
              color: "#93c5fd",
              fontWeight: "600",
              marginBottom: "28px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 6px rgba(16,185,129,0.8)" }} />
            Open beta — no credit card required
          </div>

          <h2
            style={{
              fontSize: "clamp(36px, 5vw, 60px)",
              fontWeight: "800",
              color: "#f4f4f5",
              letterSpacing: "-0.03em",
              lineHeight: "1.1",
              marginBottom: "20px",
            }}
          >
            Stop chasing.
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #3b82f6, #06b6d4, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Start settling.
            </span>
          </h2>

          <p
            style={{
              fontSize: "18px",
              color: "rgba(244,244,245,0.55)",
              maxWidth: "460px",
              margin: "0 auto 40px",
              lineHeight: "1.6",
            }}
          >
            Connect your PayPal sandbox, set your rules once, and let Settle handle the awkward conversations.
          </p>

          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/demo"
              id="final-cta-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                color: "#fff",
                fontWeight: "700",
                fontSize: "16px",
                padding: "14px 32px",
                borderRadius: "12px",
                textDecoration: "none",
                boxShadow: "0 12px 32px -4px rgba(59,130,246,0.5)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 18px 40px -4px rgba(59,130,246,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 12px 32px -4px rgba(59,130,246,0.5)";
              }}
            >
              Get early access →
            </Link>
            <Link
              href="/dashboard"
              id="final-cta-dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(244,244,245,0.85)",
                fontWeight: "600",
                fontSize: "16px",
                padding: "14px 32px",
                borderRadius: "12px",
                textDecoration: "none",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            >
              View live dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
