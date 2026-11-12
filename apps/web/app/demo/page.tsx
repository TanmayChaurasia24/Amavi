import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request Demo — Amavi",
  description: "Get early access to Amavi and see it resolve overdue invoices live.",
};

export default function DemoPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", marginBottom: "48px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "9px",
            background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: "800",
            color: "#fff",
          }}
        >
          S
        </div>
        <span style={{ fontWeight: "700", fontSize: "20px", color: "#f4f4f5", letterSpacing: "-0.02em" }}>Amavi</span>
      </Link>

      <div
        style={{
          background: "rgba(17,17,22,0.8)",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: "20px",
          padding: "48px 40px",
          width: "100%",
          maxWidth: "480px",
          textAlign: "center",
          boxShadow: "0 24px 64px -16px rgba(59,130,246,0.15)",
        }}
      >
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
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
          OPEN BETA
        </div>

        <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#f4f4f5", letterSpacing: "-0.02em", marginBottom: "10px", lineHeight: "1.2" }}>
          Get early access to Amavi
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(244,244,245,0.5)", marginBottom: "36px", lineHeight: "1.6" }}>
          We&apos;re opening the beta to freelancers and small business owners. Leave your email and we&apos;ll reach out within 48 hours.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Your name"
            style={{
              padding: "13px 16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "#f4f4f5",
              fontSize: "14px",
              outline: "none",
              width: "100%",
              fontFamily: "inherit",
            }}
          />
          <input
            type="email"
            placeholder="Your email address"
            style={{
              padding: "13px 16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "#f4f4f5",
              fontSize: "14px",
              outline: "none",
              width: "100%",
              fontFamily: "inherit",
            }}
          />
          <button
            style={{
              padding: "14px",
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Request access →
          </button>
        </div>

        <p style={{ fontSize: "12px", color: "rgba(244,244,245,0.3)", lineHeight: "1.5" }}>
          Or explore the{" "}
          <Link href="/dashboard" style={{ color: "#3b82f6", textDecoration: "none" }}>
            live sandbox dashboard
          </Link>
          {" "}right now — no signup needed.
        </p>
      </div>
    </div>
  );
}
