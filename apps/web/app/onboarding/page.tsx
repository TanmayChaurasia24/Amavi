"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Building2,
  Mail,
  User,
  Globe,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { GuardrailsForm } from "@/components/GuardrailsForm";
import {
  GuardrailsInput,
  DEFAULT_GUARDRAILS,
  describeGuardrails,
  TONE_EXAMPLES,
  CONSENT_TEXT,
  profileSchema,
} from "@/lib/guardrails";

const STEPS = ["Confirm Details", "Set Rules", "Tone & Review"];

export default function OnboardingPage() {
  const router = useRouter();

  // Loading & Step State
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [savingStep, setSavingStep] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Account Info (from DB / identity)
  const [paypalInfo, setPaypalInfo] = useState({
    name: "Alex Morgan",
    email: "alex.freelancer@example.com",
    isPaypal: false,
  });

  // Step 1: Profile State
  const [profile, setProfile] = useState({
    displayName: "Alex Morgan",
    notificationEmail: "alex.freelancer@example.com",
    timezone: "UTC",
    tone: "friendly" as "friendly" | "neutral" | "firm",
    businessNote: "",
  });

  // Step 2: Guardrails State
  const [guardrails, setGuardrails] = useState<GuardrailsInput>(DEFAULT_GUARDRAILS);

  // Step 3: Consent Checkbox
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Timezones list
  const [supportedTimezones, setSupportedTimezones] = useState<string[]>([]);

  // 1. Load initial owner state and timezones
  useEffect(() => {
    try {
      if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
        setSupportedTimezones(Intl.supportedValuesOf("timeZone"));
      } else {
        setSupportedTimezones([
          "UTC",
          "America/New_York",
          "America/Chicago",
          "America/Denver",
          "America/Los_Angeles",
          "Europe/London",
          "Europe/Paris",
          "Asia/Tokyo",
          "Asia/Kolkata",
          "Australia/Sydney",
        ]);
      }
    } catch {
      setSupportedTimezones(["UTC", "America/New_York", "Europe/London", "Asia/Kolkata"]);
    }

    // Fetch saved state from server
    fetch("/api/onboarding")
      .then((res) => res.json())
      .then((data) => {
        if (data.owner) {
          setPaypalInfo({
            name: data.owner.name || "Alex Morgan",
            email: data.owner.email || "alex.freelancer@example.com",
            isPaypal: Boolean(data.owner.paypalPayerId),
          });

          // Detect system timezone if not already customized
          const detectedTimezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

          setProfile({
            displayName: data.owner.displayName || data.owner.name || "Alex Morgan",
            notificationEmail:
              data.owner.notificationEmail ||
              data.owner.email ||
              "alex.freelancer@example.com",
            timezone: data.owner.timezone === "UTC" ? detectedTimezone : data.owner.timezone,
            tone: data.owner.tone || "friendly",
            businessNote: data.owner.businessNote || "",
          });

          // Resume at saved step (if step > 0 and onboarding not completed)
          if (
            typeof data.owner.onboardingStep === "number" &&
            data.owner.onboardingStep >= 0 &&
            data.owner.onboardingStep <= 2 &&
            !data.owner.onboardingCompletedAt
          ) {
            setCurrentStep(data.owner.onboardingStep);
          }
        }

        if (data.guardrails) {
          setGuardrails(data.guardrails);
        }
      })
      .catch((err) => {
        console.error("Failed to load onboarding:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Save intermediate step progress
  const saveStepProgress = async (stepNumber: number) => {
    setSavingStep(true);
    setErrorMsg(null);
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: stepNumber,
          profile,
          guardrails,
        }),
      });
    } catch (err) {
      console.warn("Failed to persist step progress:", err);
    } finally {
      setSavingStep(false);
    }
  };

  // Step 1 Validation & Proceed
  const handleProceedFromStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate Profile fields
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || "Please check your profile details");
      return;
    }

    await saveStepProgress(1);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 2 Proceed to Step 3
  const handleProceedFromStep2 = async () => {
    await saveStepProgress(2);
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Submit on Step 3
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentAccepted) {
      setErrorMsg("You must accept the terms and consent to finalize setup.");
      return;
    }

    setFinishing(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          guardrails,
          consentAccepted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete setup");
      }

      router.push(data.redirect || "/dashboard?welcome=true");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error completing onboarding");
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400 text-sm">
          <RotateCw className="w-5 h-5 animate-spin text-blue-500" />
          <span>Loading your setup workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col items-center justify-start py-10 px-4 sm:px-6 font-sans selection:bg-blue-600 selection:text-white">
      {/* Brand Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-md shadow-blue-500/20">
            <div className="w-full h-full bg-[#0c0d12] rounded-[7px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <span className="text-lg font-bold tracking-tight text-white font-sans">
            Settle
          </span>
        </Link>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span>Sandbox Demo</span>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-2xl bg-[#0e1017] border border-[#1f222e] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} steps={STEPS} />

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            STEP 1: CONFIRM DETAILS
            ════════════════════════════════════════════════════════════════════════ */}
        {currentStep === 0 && (
          <form onSubmit={handleProceedFromStep1} className="mt-6 space-y-6">
            {/* Account Connected Banner */}
            <div className="p-4 rounded-xl bg-[#121522] border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                  paypalInfo.isPaypal
                    ? "bg-gradient-to-tr from-[#003087] to-[#0079C1]"
                    : "bg-gradient-to-tr from-blue-600 to-indigo-600"
                }`}>
                  <span className="text-white font-extrabold text-base">
                    {paypalInfo.isPaypal ? "P" : (paypalInfo.name?.[0] || "U")}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {paypalInfo.isPaypal ? "PayPal Connected" : "Account Connected"}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {paypalInfo.isPaypal ? "Sandbox" : "Active"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {paypalInfo.name} ({paypalInfo.email})
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400 sm:text-right max-w-xs">
                {paypalInfo.isPaypal
                  ? "We use this to create your account. This doesn't give Settle access to your PayPal funds."
                  : "We use this profile for client collection notices and approval requests."}
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Confirm your details
              </h2>
              <p className="text-xs text-zinc-400">
                Set how clients recognize you in negotiation emails and where approval notifications go.
              </p>
            </div>

            <div className="space-y-4">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Display Name</span>
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={profile.displayName}
                  onChange={(e) =>
                    setProfile({ ...profile, displayName: e.target.value })
                  }
                  placeholder="e.g. Alex Morgan or Studio Apex"
                  className="w-full px-3.5 py-2.5 bg-[#08090d] border border-[#222533] rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                  required
                />
                <p className="text-[11px] text-zinc-500">
                  This is how clients see you in messages and automated replies.
                </p>
              </div>

              {/* Notification Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>Notification Email</span>
                </label>
                <input
                  type="email"
                  value={profile.notificationEmail}
                  onChange={(e) =>
                    setProfile({ ...profile, notificationEmail: e.target.value })
                  }
                  placeholder="you@yourdomain.com"
                  className="w-full px-3.5 py-2.5 bg-[#08090d] border border-[#222533] rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                  required
                />
                <p className="text-[11px] text-zinc-500">
                  Where we send escalation tickets and approval requests.
                </p>
              </div>

              {/* Timezone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Timezone</span>
                </label>
                <select
                  value={profile.timezone}
                  onChange={(e) =>
                    setProfile({ ...profile, timezone: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#08090d] border border-[#222533] rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                >
                  {supportedTimezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500">
                  Auto-detected from your browser. Used for scheduling installment due dates and business hours.
                </p>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 border-t border-[#1f222e] flex items-center justify-end">
              <button
                type="submit"
                disabled={savingStep}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                <span>{savingStep ? "Saving..." : "Continue to Rules"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            STEP 2: SET YOUR RULES (GUARDRAILS)
            ════════════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="mt-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Set your rules
              </h2>
              <p className="text-xs text-zinc-400">
                Settle only acts inside these limits. You can change them anytime in Settings.
              </p>
            </div>

            {/* Shared Guardrails Form */}
            <GuardrailsForm
              value={guardrails}
              onChange={setGuardrails}
              showSummaryCard={true}
              showResetButton={true}
            />

            {/* Navigation Buttons */}
            <div className="pt-4 border-t border-[#1f222e] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#141620] hover:bg-[#1b1f2e] border border-[#272b3c] text-xs font-semibold text-zinc-300 hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleProceedFromStep2}
                disabled={savingStep}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                <span>{savingStep ? "Saving..." : "Continue to Voice & Review"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            STEP 3: TONE, REVIEW & CONSENT
            ════════════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <form onSubmit={handleFinalSubmit} className="mt-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                How Settle should sound
              </h2>
              <p className="text-xs text-zinc-400">
                Choose the communication tone for payment reminders and client settlement replies.
              </p>
            </div>

            {/* Tone Selector Radio Cards */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Default Communication Tone</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["friendly", "neutral", "firm"] as const).map((t) => {
                  const meta = TONE_EXAMPLES[t];
                  const isSelected = profile.tone === t;

                  return (
                    <div
                      key={t}
                      onClick={() => setProfile({ ...profile, tone: t })}
                      className={`cursor-pointer rounded-xl p-4 border transition-all text-left flex flex-col justify-between ${
                        isSelected
                          ? "bg-blue-950/30 border-blue-500/60 ring-2 ring-blue-500/20"
                          : "bg-[#11131a] border-[#1f222e] hover:border-zinc-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-sm font-bold ${
                              isSelected ? "text-blue-300" : "text-zinc-200"
                            }`}
                          >
                            {meta.label}
                          </span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-blue-400 bg-blue-500"
                                : "border-zinc-700"
                            }`}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal mb-3">
                          {meta.description}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#08090d] border border-[#1b1e2a] text-[11px] text-zinc-300 font-sans italic">
                        <span className="text-[10px] font-bold uppercase not-italic text-zinc-500 block mb-0.5">
                          Example Reminder:
                        </span>
                        &ldquo;{meta.example}&rdquo;
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* About Your Business Textarea */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>About your business (Optional)</span>
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    profile.businessNote.length > 280
                      ? "text-amber-400"
                      : "text-zinc-500"
                  }`}
                >
                  {profile.businessNote.length}/300
                </span>
              </div>
              <textarea
                maxLength={300}
                rows={3}
                value={profile.businessNote}
                onChange={(e) =>
                  setProfile({ ...profile, businessNote: e.target.value })
                }
                placeholder="e.g. Freelance brand & web designer. I invoice on milestones and value transparent, long-term relationships."
                className="w-full px-3.5 py-2.5 bg-[#08090d] border border-[#222533] rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans resize-none"
              />
              <p className="text-[11px] text-zinc-500">
                Helps Settle write replies that sound like you.
              </p>
            </div>

            {/* Review Block */}
            <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-5 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-[#1d202c] pb-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Configuration Review</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Display Name:</span>
                  <span className="text-zinc-200 font-semibold">{profile.displayName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Notification Email:</span>
                  <span className="text-zinc-200 font-semibold">{profile.notificationEmail}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Timezone:</span>
                  <span className="text-zinc-200 font-semibold">{profile.timezone}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Tone:</span>
                  <span className="text-zinc-200 font-semibold capitalize">{profile.tone}</span>
                </div>
              </div>

              <div className="p-3 bg-[#08090d] rounded-lg border border-[#1b1e2a] text-xs text-zinc-300">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Guardrails Policy:
                </span>
                &ldquo;{describeGuardrails(guardrails)}&rdquo;
              </div>
            </div>

            {/* Required Consent Checkbox */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  required
                />
                <span className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {CONSENT_TEXT}
                </span>
              </label>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 border-t border-[#1f222e] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#141620] hover:bg-[#1b1f2e] border border-[#272b3c] text-xs font-semibold text-zinc-300 hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={!consentAccepted || finishing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {finishing ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Finalizing Setup...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finish Setup & Launch Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Links */}
      <p className="mt-8 text-xs text-zinc-500">
        <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
        {" · "}
        <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
      </p>
    </div>
  );
}

