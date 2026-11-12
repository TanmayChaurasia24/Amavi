import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Amavi",
};

function SimplePage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09090b",
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
        color: "#f4f4f5",
      }}
    >
      <header
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: "800",
              color: "#fff",
            }}
          >
            S
          </div>
          <span style={{ fontWeight: "700", fontSize: "16px", color: "#f4f4f5", letterSpacing: "-0.02em" }}>Amavi</span>
        </Link>
        <span style={{ color: "rgba(244,244,245,0.2)", fontSize: "16px" }}>/</span>
        <span style={{ fontSize: "14px", color: "rgba(244,244,245,0.5)" }}>{title}</span>
      </header>

      <main style={{ maxWidth: "740px", margin: "0 auto", padding: "64px 24px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "8px" }}>{title}</h1>
        <p style={{ fontSize: "13px", color: "rgba(244,244,245,0.35)", marginBottom: "48px" }}>
          Last updated: October 2026 · Amavi is a hackathon prototype. This document is for demonstration purposes only.
        </p>
        {children}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "36px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "10px", color: "#f4f4f5" }}>{title}</h2>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "14px", color: "rgba(244,244,245,0.6)", lineHeight: "1.75", marginBottom: "12px" }}>
      {children}
    </p>
  );
}

export default function PrivacyPage() {
  return (
    <SimplePage title="Privacy Policy">
      <Section title="What we collect">
        <P>
          During the beta, Amavi collects your PayPal OAuth token (stored server-side, never persisted to the database), invoice data fetched from PayPal&apos;s API, and webhook event payloads. We do not collect any personal financial information directly.
        </P>
      </Section>
      <Section title="How we use your data">
        <P>
          Invoice and client data is used solely to operate the AI collections agent on your behalf. We do not sell, share, or use your data for advertising purposes.
        </P>
      </Section>
      <Section title="PayPal integration">
        <P>
          Amavi integrates with PayPal&apos;s sandbox REST API. Your PayPal Client ID and Secret are stored as environment variables and never written to any database. Webhook events are verified using PayPal&apos;s signature verification endpoint before processing.
        </P>
      </Section>
      <Section title="Data retention">
        <P>
          Invoice records, audit logs, and webhook events are retained in our Postgres database for the duration of your use of the service. You may request deletion at any time by contacting us.
        </P>
      </Section>
      <Section title="Contact">
        <P>This is a hackathon prototype. For questions, open an issue on the public GitHub repository.</P>
      </Section>
    </SimplePage>
  );
}
