"use client";

import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "60px 24px 40px",
        background: "rgba(9,9,11,0.8)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: "48px",
            marginBottom: "60px",
          }}
          className="footer-grid"
        >
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "7px",
                  background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#fff",
                }}
              >
                S
              </div>
              <span style={{ fontWeight: "700", fontSize: "17px", color: "#f4f4f5", letterSpacing: "-0.02em" }}>
                Amavi
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "rgba(244,244,245,0.4)", lineHeight: "1.6", maxWidth: "280px", marginBottom: "20px" }}>
              AI collections agent for freelancers and small businesses who invoice through PayPal. Built for the PayPal &ldquo;Build What&rsquo;s Next&rdquo; hackathon.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(244,244,245,0.5)",
                  textDecoration: "none",
                  fontSize: "14px",
                  transition: "background 0.2s, color 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#f4f4f5";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "rgba(244,244,245,0.5)";
                }}
                aria-label="GitHub"
              >
                ⌥
              </a>
            </div>
          </div>

          {/* Product links */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "rgba(244,244,245,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>
              Product
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "How it works", href: "#how-it-works" },
                { label: "Guardrails", href: "#guardrails" },
                { label: "Pricing", href: "#pricing" },
                { label: "Live dashboard", href: "/dashboard" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  style={{ fontSize: "13px", color: "rgba(244,244,245,0.45)", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f4f4f5")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,244,245,0.45)")}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Developers */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "rgba(244,244,245,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>
              Developers
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "GitHub repo", href: "https://github.com" },
                { label: "API reference", href: "/demo" },
                { label: "PayPal sandbox", href: "https://developer.paypal.com" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  style={{ fontSize: "13px", color: "rgba(244,244,245,0.45)", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f4f4f5")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,244,245,0.45)")}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "rgba(244,244,245,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>
              Legal
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "Privacy policy", href: "/privacy" },
                { label: "Terms of service", href: "/terms" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ fontSize: "13px", color: "rgba(244,244,245,0.45)", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f4f4f5")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,244,245,0.45)")}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: "28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "12px", color: "rgba(244,244,245,0.3)" }}>
            © {year} Amavi. MIT licence. Built for the PayPal &ldquo;Build What&rsquo;s Next with PayPal and AI&rdquo; hackathon.
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "rgba(244,244,245,0.25)" }}>Powered by</span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                background: "linear-gradient(135deg, #009cde, #003087)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              PayPal
            </span>
            <span style={{ fontSize: "12px", color: "rgba(244,244,245,0.25)" }}>+</span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                background: "linear-gradient(135deg, #4ade80, #06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Claude AI
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
