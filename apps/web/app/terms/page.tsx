import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Settle",
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
          <span style={{ fontWeight: "700", fontSize: "16px", color: "#f4f4f5", letterSpacing: "-0.02em" }}>Settle</span>
        </Link>
        <span style={{ color: "rgba(244,244,245,0.2)", fontSize: "16px" }}>/</span>
        <span style={{ fontSize: "14px", color: "rgba(244,244,245,0.5)" }}>{title}</span>
      </header>

      <main style={{ maxWidth: "740px", margin: "0 auto", padding: "64px 24px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "8px" }}>{title}</h1>
        <p style={{ fontSize: "13px", color: "rgba(244,244,245,0.35)", marginBottom: "48px" }}>
          Last updated: October 2026 · Settle is a hackathon prototype. This document is for demonstration purposes only.
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

export default function TermsPage() {
  return (
    <SimplePage title="Terms of Service">
      <Section title="Acceptance">
        <P>
          By using Settle during the beta period, you agree to these terms. Settle is a prototype built for the PayPal &ldquo;Build What&rsquo;s Next with PayPal and AI&rdquo; hackathon and is provided as-is for demonstration purposes.
        </P>
      </Section>
      <Section title="Scope of service">
        <P>
          Settle is an AI-assisted collections tool that integrates with PayPal&apos;s sandbox API. It is not a licensed debt collection agency and does not provide legal or financial advice. All payment plan decisions remain the responsibility of the account holder.
        </P>
      </Section>
      <Section title="PayPal sandbox only">
        <P>
          During beta, Settle operates exclusively with PayPal&apos;s sandbox environment. No real money is processed. Any sandbox transactions are test data only and have no real-world financial effect.
        </P>
      </Section>
      <Section title="Guardrails and AI decisions">
        <P>
          Settle&apos;s AI agent operates within owner-configured guardrails. All guardrail validation is performed by deterministic server-side code. The account holder is responsible for configuring appropriate guardrails for their business context.
        </P>
      </Section>
      <Section title="Limitation of liability">
        <P>
          Settle is provided without warranty of any kind. To the maximum extent permitted by applicable law, the authors disclaim all liability for any direct, indirect, or consequential damages arising from use of this software.
        </P>
      </Section>
      <Section title="Open source">
        <P>
          Settle is open source under the MIT licence. You are free to use, modify, and distribute the code in accordance with the terms of that licence.
        </P>
      </Section>
    </SimplePage>
  );
}
