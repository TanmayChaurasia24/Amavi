"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: "all 0.3s ease",
        background: scrolled
          ? "rgba(9,9,11,0.92)"
          : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 24px",
          height: "68px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: "800",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            S
          </div>
          <span style={{ fontWeight: "700", fontSize: "18px", color: "#f4f4f5", letterSpacing: "-0.02em" }}>
            Amavi
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: "32px" }} className="hide-mobile">
          {[
            { label: "How it works", href: "#how-it-works" },
            { label: "Guardrails", href: "#guardrails" },
            { label: "Pricing", href: "#pricing" },
            { label: "FAQ", href: "#faq" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                fontSize: "14px",
                color: "rgba(244,244,245,0.7)",
                textDecoration: "none",
                transition: "color 0.2s",
                fontWeight: "500",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f4f4f5")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,244,245,0.7)")}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }} className="hide-mobile">
          <Link
            href="/login"
            style={{
              fontSize: "14px",
              color: "rgba(244,244,245,0.8)",
              textDecoration: "none",
              fontWeight: "500",
              padding: "8px 16px",
            }}
          >
            Log in
          </Link>
          <Link
            href="/demo"
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#fff",
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              padding: "9px 20px",
              borderRadius: "8px",
              textDecoration: "none",
              transition: "opacity 0.2s, transform 0.2s",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Get early access →
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className="show-mobile"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#f4f4f5",
            padding: "8px",
            display: "none",
          }}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {menuOpen ? (
              <>
                <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            ) : (
              <>
                <line x1="3" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="17" x2="19" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            background: "rgba(9,9,11,0.98)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "20px 24px",
          }}
        >
          {[
            { label: "How it works", href: "#how-it-works" },
            { label: "Guardrails", href: "#guardrails" },
            { label: "Pricing", href: "#pricing" },
            { label: "FAQ", href: "#faq" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: "block",
                fontSize: "16px",
                color: "rgba(244,244,245,0.8)",
                textDecoration: "none",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                fontWeight: "500",
              }}
            >
              {item.label}
            </a>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
            <Link
              href="/login"
              style={{
                textAlign: "center",
                fontSize: "15px",
                color: "rgba(244,244,245,0.8)",
                textDecoration: "none",
                padding: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontWeight: "500",
              }}
            >
              Log in
            </Link>
            <Link
              href="/demo"
              style={{
                textAlign: "center",
                fontSize: "15px",
                fontWeight: "600",
                color: "#fff",
                background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                padding: "12px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Get early access →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
