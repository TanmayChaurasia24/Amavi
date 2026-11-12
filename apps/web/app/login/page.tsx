"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  PlayCircle,
  RotateCw,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  // Mode: "signin" | "signup"
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingPaypal, setLoadingPaypal] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to sign in. Please verify your credentials.");
        return;
      }

      router.push(data.redirect || "/dashboard");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Manual Sign Up (Register)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to create account. Please check your details.");
        return;
      }

      router.push(data.redirect || "/onboarding");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // PayPal Auth (Kept silent as alternative)
  const handleStartPaypal = async () => {
    setLoadingPaypal(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/start-onboarding", { method: "POST" });
      const data = await res.json();
      router.push(data.redirect || "/onboarding");
    } catch {
      router.push("/onboarding");
    } finally {
      setLoadingPaypal(false);
    }
  };

  // Demo Workspace for Judges
  const handleContinueDemo = async () => {
    setLoadingDemo(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = await res.json();
      router.push(data.redirect || "/dashboard");
    } catch {
      router.push("/dashboard");
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
      }}
    >
      {/* Brand Header */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          textDecoration: "none",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "19px",
            fontWeight: "800",
            color: "#fff",
            boxShadow: "0 8px 24px -4px rgba(59,130,246,0.35)",
          }}
        >
          S
        </div>
        <span
          style={{
            fontWeight: "700",
            fontSize: "22px",
            color: "#f4f4f5",
            letterSpacing: "-0.02em",
          }}
        >
          Amavi
        </span>
      </Link>

      {/* Main Auth Card */}
      <div
        style={{
          background: "rgba(17,17,22,0.92)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "36px 32px",
          width: "100%",
          maxWidth: "440px",
          boxShadow: "0 24px 64px -16px rgba(0,0,0,0.65)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Environment Badge */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: "100px",
              padding: "4px 12px",
              fontSize: "11px",
              color: "#60a5fa",
              fontWeight: "600",
              letterSpacing: "0.02em",
            }}
          >
            <Sparkles style={{ width: "12px", height: "12px" }} />
            <span>PAYPAL SANDBOX EDITION</span>
          </div>
        </div>

        {/* Auth Mode Tabs (Sign In / Sign Up) */}
        <div
          style={{
            display: "flex",
            background: "rgba(255,255,255,0.04)",
            padding: "4px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMsg(null);
            }}
            style={{
              flex: 1,
              padding: "9px 0",
              fontSize: "13px",
              fontWeight: mode === "signin" ? "700" : "500",
              color: mode === "signin" ? "#fff" : "#a1a1aa",
              background: mode === "signin" ? "#1e2230" : "transparent",
              border: mode === "signin" ? "1px solid rgba(255,255,255,0.12)" : "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
            }}
            style={{
              flex: 1,
              padding: "9px 0",
              fontSize: "13px",
              fontWeight: mode === "signup" ? "700" : "500",
              color: mode === "signup" ? "#fff" : "#a1a1aa",
              background: mode === "signup" ? "#1e2230" : "transparent",
              border: mode === "signup" ? "1px solid rgba(255,255,255,0.12)" : "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(225, 29, 72, 0.12)",
              border: "1px solid rgba(225, 29, 72, 0.35)",
              color: "#fda4af",
              fontSize: "12px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              marginBottom: "20px",
              lineHeight: "1.4",
            }}
          >
            <AlertCircle style={{ width: "16px", height: "16px", flexShrink: 0, marginTop: "1px" }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form: Sign In */}
        {mode === "signin" ? (
          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#d4d4d8",
                  marginBottom: "6px",
                }}
              >
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "15px",
                    height: "15px",
                    color: "#71717a",
                  }}
                />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 12px 11px 36px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#d4d4d8",
                  marginBottom: "6px",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "15px",
                    height: "15px",
                    color: "#71717a",
                  }}
                />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 12px 11px 36px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "4px",
                width: "100%",
                padding: "13px 20px",
                background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                border: "none",
                borderRadius: "11px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <RotateCw style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight style={{ width: "16px", height: "16px" }} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Form: Sign Up */
          <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#d4d4d8",
                  marginBottom: "6px",
                }}
              >
                Full Name
              </label>
              <div style={{ position: "relative" }}>
                <User
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "15px",
                    height: "15px",
                    color: "#71717a",
                  }}
                />
                <input
                  type="text"
                  required
                  placeholder="Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 12px 11px 36px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#d4d4d8",
                  marginBottom: "6px",
                }}
              >
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "15px",
                    height: "15px",
                    color: "#71717a",
                  }}
                />
                <input
                  type="email"
                  required
                  placeholder="alex.freelancer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 12px 11px 36px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#d4d4d8",
                  marginBottom: "6px",
                }}
              >
                Password (min 8 chars)
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "15px",
                    height: "15px",
                    color: "#71717a",
                  }}
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 12px 11px 36px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "4px",
                width: "100%",
                padding: "13px 20px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                border: "none",
                borderRadius: "11px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <RotateCw style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Onboard</span>
                  <ArrowRight style={{ width: "16px", height: "16px" }} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "24px 0",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>
            or continue with
          </span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Silent / Secondary: Log in with PayPal */}
        <button
          type="button"
          onClick={handleStartPaypal}
          disabled={loadingPaypal}
          style={{
            width: "100%",
            padding: "11px 18px",
            background: "rgba(0, 121, 193, 0.08)",
            border: "1px solid rgba(0, 121, 193, 0.3)",
            borderRadius: "11px",
            color: "#60a5fa",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "10px",
            transition: "all 0.15s ease",
            opacity: loadingPaypal ? 0.7 : 1,
          }}
        >
          {loadingPaypal ? (
            <RotateCw style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#38bdf8">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72c.07-.392.408-.678.808-.678h6.944c2.92 0 4.913 1.225 5.453 3.36.227.88.204 1.72-.007 2.494-.027.1-.051.196-.074.29.218.113.416.245.588.398C19.52 10.6 20 12.164 20 14c0 3.594-2.793 7.337-7.924 7.337H7.076z" />
            </svg>
          )}
          <span>{loadingPaypal ? "Connecting to PayPal..." : "Log in with PayPal (Sandbox)"}</span>
        </button>

        {/* Secondary Action: Demo Workspace for Judges */}
        <button
          type="button"
          onClick={handleContinueDemo}
          disabled={loadingDemo}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "11px",
            color: "#a1a1aa",
            fontSize: "12px",
            fontWeight: "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "20px",
            transition: "all 0.15s ease",
            opacity: loadingDemo ? 0.7 : 1,
          }}
        >
          <PlayCircle style={{ width: "15px", height: "15px", color: "#38bdf8" }} />
          <span>{loadingDemo ? "Opening Demo..." : "Continue with the demo workspace"}</span>
        </button>

        {/* Transparency & Security Note */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "10px",
            background: "rgba(59,130,246,0.05)",
            border: "1px solid rgba(59,130,246,0.12)",
            textAlign: "left",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
          }}
        >
          <ShieldCheck style={{ width: "15px", height: "15px", color: "#60a5fa", flexShrink: 0, marginTop: "2px" }} />
          <p style={{ fontSize: "11px", color: "#93c5fd", lineHeight: "1.4", margin: 0 }}>
            <strong>Identity & Guardrails:</strong> Amavi negotiates payments inside the safety limits you define. Passwords are securely hashed with scrypt, and sessions use secure HTTP-only cookies.
          </p>
        </div>
      </div>

      <p style={{ marginTop: "24px", fontSize: "12px", color: "rgba(244,244,245,0.3)" }}>
        <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
        {" · "}
        <Link href="/terms" style={{ color: "inherit", textDecoration: "none" }}>Terms</Link>
      </p>
    </div>
  );
}
