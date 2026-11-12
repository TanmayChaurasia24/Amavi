"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Animated typing for the message
const CLIENT_MESSAGES = [
  "Can I pay $300 now and the rest next month?",
  "I'm a bit short — can we split this into 3 payments?",
  "Could you give me a 10% discount if I pay today?",
  "I'll send $500 now, is that okay?",
];

const AGENT_REPLY = `Sure — here's a plan that works within my client's terms:\n\n• Deposit: $300 today (30% upfront ✓)\n• Remaining $700 in 2 monthly instalments\n• Total duration: 60 days ✓\n\nPayPal link: pay.paypal.com/invoice/INV-0042`;

function TypingText({ text, speed = 28 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setDisplayed("");
    setIdx(0);
  }, [text]);

  useEffect(() => {
    if (idx >= text.length) return;
    const t = setTimeout(() => {
      setDisplayed((p) => p + text[idx]);
      setIdx((i) => i + 1);
    }, speed);
    return () => clearTimeout(t);
  }, [idx, text, speed]);

  return (
    <span>
      {displayed}
      {idx < text.length && (
        <span
          style={{
            display: "inline-block",
            width: "2px",
            height: "14px",
            background: "#3b82f6",
            marginLeft: "2px",
            verticalAlign: "middle",
            animation: "blink 0.8s step-end infinite",
          }}
        />
      )}
    </span>
  );
}

function HeroDemo() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [stage, setStage] = useState<"typing" | "reply" | "done">("typing");
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");

  const currentMsg = CLIENT_MESSAGES[msgIdx]!;

  // Cycle through messages
  useEffect(() => {
    setStage("typing");
    setShowReply(false);
    setReplyText("");
    const typingDuration = currentMsg.length * 28 + 600;
    const t1 = setTimeout(() => {
      setStage("reply");
      setShowReply(true);
      // Type agent reply
      let i = 0;
      const interval = setInterval(() => {
        if (i >= AGENT_REPLY.length) {
          clearInterval(interval);
          setStage("done");
        } else {
          setReplyText(AGENT_REPLY.slice(0, i + 1));
          i++;
        }
      }, 14);
      return () => clearInterval(interval);
    }, typingDuration);

    const t2 = setTimeout(() => {
      setMsgIdx((prev) => (prev + 1) % CLIENT_MESSAGES.length);
    }, typingDuration + AGENT_REPLY.length * 14 + 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [msgIdx]);// eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        background: "rgba(17,17,22,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        overflow: "hidden",
        maxWidth: "540px",
        width: "100%",
        boxShadow: "0 32px 80px -16px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,130,246,0.15)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Window chrome */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(12,12,18,0.6)",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />
          ))}
        </div>
        <span style={{ fontSize: "11px", color: "rgba(244,244,245,0.4)", marginLeft: "8px", fontFamily: "monospace" }}>
          amavi — invoice INV-0042 · Meridian Design Co.
        </span>
      </div>

      {/* Chat area */}
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", minHeight: "260px" }}>
        {/* Invoice pill */}
        <div
          style={{
            alignSelf: "center",
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: "20px",
            padding: "4px 14px",
            fontSize: "11px",
            color: "#f59e0b",
            fontWeight: "600",
          }}
        >
          ⚠️ OVERDUE — $1,000.00 — 23 days late
        </div>

        {/* Client message */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: "12px 12px 2px 12px",
              padding: "10px 14px",
              maxWidth: "85%",
              fontSize: "13px",
              color: "#e2e8f0",
              lineHeight: "1.5",
            }}
          >
            <TypingText text={currentMsg} />
          </div>
        </div>

        {/* Agent reply */}
        {showReply && (
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "800",
                color: "#fff",
              }}
            >
              S
            </div>
            <div
              style={{
                background: "rgba(6,182,212,0.08)",
                border: "1px solid rgba(6,182,212,0.2)",
                borderRadius: "2px 12px 12px 12px",
                padding: "10px 14px",
                maxWidth: "85%",
                fontSize: "13px",
                color: "#e2e8f0",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
              }}
            >
              {replyText}
              {stage !== "done" && (
                <span
                  style={{
                    display: "inline-block",
                    width: "2px",
                    height: "13px",
                    background: "#06b6d4",
                    marginLeft: "2px",
                    verticalAlign: "middle",
                    animation: "blink 0.8s step-end infinite",
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Guardrail badges */}
        {stage === "done" && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              animation: "fadeSlideUp 0.4s ease",
            }}
          >
            {[
              { label: "Deposit ≥ 30% ✓", color: "#10b981" },
              { label: "Duration ≤ 60d ✓", color: "#10b981" },
              { label: "PayPal updated ✓", color: "#10b981" },
            ].map((b) => (
              <span
                key={b.label}
                style={{
                  fontSize: "10px",
                  fontWeight: "600",
                  color: b.color,
                  background: `${b.color}15`,
                  border: `1px solid ${b.color}30`,
                  borderRadius: "4px",
                  padding: "3px 8px",
                }}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 24px 80px",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "600px",
          background: "radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, rgba(6,182,212,0.06) 40%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)
          `,
          backgroundSize: "40px 40px",
          pointerEvents: "none",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)",
        }}
      />

      <div style={{ position: "relative", maxWidth: "1200px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.25)",
            borderRadius: "100px",
            padding: "5px 14px 5px 8px",
            marginBottom: "32px",
            fontSize: "12px",
            color: "#93c5fd",
            fontWeight: "600",
          }}
        >
          <span
            style={{
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              borderRadius: "100px",
              padding: "2px 8px",
              color: "#fff",
              fontSize: "10px",
              letterSpacing: "0.05em",
            }}
          >
            NEW
          </span>
          Built for the PayPal AI Hackathon — live sandbox demo
        </div>

        {/* Main headline */}
        <h1
          style={{
            fontSize: "clamp(40px, 6vw, 72px)",
            fontWeight: "800",
            textAlign: "center",
            lineHeight: "1.1",
            letterSpacing: "-0.03em",
            color: "#f4f4f5",
            maxWidth: "820px",
            marginBottom: "24px",
          }}
        >
          Stop chasing invoices.{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Let AI settle them.
          </span>
        </h1>

        {/* Subhead */}
        <p
          style={{
            fontSize: "clamp(16px, 2.5vw, 20px)",
            color: "rgba(244,244,245,0.6)",
            textAlign: "center",
            maxWidth: "580px",
            lineHeight: "1.6",
            marginBottom: "40px",
          }}
        >
          Amavi reads client replies to overdue invoices, offers a payment plan inside your rules, and sets it up in PayPal — automatically. You stay in control; it does the legwork.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center", marginBottom: "64px" }}>
          <Link
            href="/demo"
            id="hero-cta-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              color: "#fff",
              fontWeight: "700",
              fontSize: "15px",
              padding: "13px 28px",
              borderRadius: "10px",
              textDecoration: "none",
              boxShadow: "0 8px 24px -4px rgba(59,130,246,0.4)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 14px 32px -4px rgba(59,130,246,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px -4px rgba(59,130,246,0.4)";
            }}
          >
            Try the live demo →
          </Link>
          <a
            href="#how-it-works"
            id="hero-cta-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(244,244,245,0.85)",
              fontWeight: "600",
              fontSize: "15px",
              padding: "13px 28px",
              borderRadius: "10px",
              textDecoration: "none",
              transition: "background 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            }}
          >
            See how it works
          </a>
        </div>

        {/* Hero Demo */}
        <HeroDemo />

        {/* Stat strip */}
        <div
          style={{
            display: "flex",
            gap: "48px",
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: "64px",
            paddingTop: "48px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            width: "100%",
          }}
        >
          {[
            { stat: "59%", label: "of freelancers have an invoice 30+ days overdue", source: "Xero Small Business Insights, 2023" },
            { stat: "£51k", label: "average SMB owed in late payments", source: "Barclays, 2023" },
            { stat: "$3T+", label: "in outstanding B2B receivables globally", source: "Atradius Payment Practices Barometer, 2023" },
          ].map((item) => (
            <div key={item.stat} style={{ textAlign: "center", flex: "1 1 180px" }}>
              <div
                style={{
                  fontSize: "clamp(28px, 4vw, 40px)",
                  fontWeight: "800",
                  background: "linear-gradient(135deg, #f4f4f5, rgba(244,244,245,0.6))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.03em",
                  marginBottom: "6px",
                }}
              >
                {item.stat}
              </div>
              <div style={{ fontSize: "13px", color: "rgba(244,244,245,0.5)", lineHeight: "1.4", maxWidth: "200px", margin: "0 auto" }}>
                {item.label}
              </div>
              <div style={{ fontSize: "10px", color: "rgba(244,244,245,0.3)", marginTop: "4px" }}>
                {item.source}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
