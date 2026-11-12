"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sliders,
  User,
  MessageSquare,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  LogOut,
  Trash2,
  Lock,
  Globe,
  Mail,
  Building2,
  Sparkles,
} from "lucide-react";
import { GuardrailsForm } from "@/components/GuardrailsForm";
import {
  GuardrailsInput,
  DEFAULT_GUARDRAILS,
  describeGuardrails,
  TONE_EXAMPLES,
  ProfileInput,
  CONSENT_TEXT,
} from "@/lib/guardrails";

type TabKey = "rules" | "profile" | "communication" | "account";

export default function SettingsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("rules");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guardrails State
  const [guardrails, setGuardrails] = useState<GuardrailsInput>(DEFAULT_GUARDRAILS);
  const [initialGuardrails, setInitialGuardrails] = useState<GuardrailsInput>(DEFAULT_GUARDRAILS);
  const [lastUpdatedDate, setLastUpdatedDate] = useState<string | null>(null);

  // Profile & Owner State
  const [profile, setProfile] = useState<ProfileInput>({
    displayName: "",
    notificationEmail: "",
    timezone: "UTC",
    tone: "friendly",
    businessNote: "",
  });
  const [initialProfile, setInitialProfile] = useState<ProfileInput>({
    displayName: "",
    notificationEmail: "",
    timezone: "UTC",
    tone: "friendly",
    businessNote: "",
  });

  const [ownerDetails, setOwnerDetails] = useState<{
    id: string;
    email: string;
    name: string;
    consentAcceptedAt: string | null;
    consentVersion: string | null;
    isDemo: boolean;
  }>({
    id: "",
    email: "",
    name: "",
    consentAcceptedAt: null,
    consentVersion: null,
    isDemo: false,
  });

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Timezones
  const [supportedTimezones, setSupportedTimezones] = useState<string[]>([]);

  useEffect(() => {
    try {
      if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
        setSupportedTimezones(Intl.supportedValuesOf("timeZone"));
      } else {
        setSupportedTimezones(["UTC", "America/New_York", "Europe/London", "Asia/Kolkata"]);
      }
    } catch {
      setSupportedTimezones(["UTC", "America/New_York", "Europe/London", "Asia/Kolkata"]);
    }

    // Load Guardrails & Owner Profile concurrently
    Promise.all([
      fetch("/api/guardrails").then((res) => res.json()),
      fetch("/api/owner").then((res) => res.json()),
    ])
      .then(([guardrailData, ownerData]) => {
        if (guardrailData.guardrails) {
          const g: GuardrailsInput = {
            minDepositPct: guardrailData.guardrails.minDepositPct,
            maxPlanDays:
              guardrailData.guardrails.maxPlanDays ??
              guardrailData.guardrails.maxPlanDurationDays ??
              60,
            maxInstalments: guardrailData.guardrails.maxInstalments ?? 3,
            allowDiscounts: guardrailData.guardrails.allowDiscounts,
            maxDiscountPct: guardrailData.guardrails.maxDiscountPct,
            autoApproveThresholdCents:
              guardrailData.guardrails.autoApproveThresholdCents,
            escalateDisputes: true,
            escalateHardship: true,
          };
          setGuardrails(g);
          setInitialGuardrails(g);
          if (guardrailData.guardrails.updatedAt) {
            setLastUpdatedDate(
              new Date(guardrailData.guardrails.updatedAt).toLocaleString()
            );
          }
        }

        if (ownerData.owner) {
          const o = ownerData.owner;
          const p: ProfileInput = {
            displayName: o.displayName || o.name || "",
            notificationEmail: o.notificationEmail || o.email || "",
            timezone: o.timezone || "UTC",
            tone: o.tone || "friendly",
            businessNote: o.businessNote || "",
          };
          setProfile(p);
          setInitialProfile(p);
          setOwnerDetails({
            id: o.id,
            email: o.email,
            name: o.name,
            consentAcceptedAt: o.consentAcceptedAt,
            consentVersion: o.consentVersion,
            isDemo: Boolean(o.isDemo),
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
        setErrorMessage("Failed to load settings from server.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Dirty state detection
  const isDirty =
    JSON.stringify(guardrails) !== JSON.stringify(initialGuardrails) ||
    JSON.stringify(profile) !== JSON.stringify(initialProfile);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      // 1. Save Guardrails
      const guardrailRes = await fetch("/api/guardrails", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guardrails),
      });
      const guardrailJson = await guardrailRes.json();
      if (!guardrailRes.ok) {
        throw new Error(guardrailJson.error || "Failed to update guardrails");
      }

      // 2. Save Profile & Communication
      const ownerRes = await fetch("/api/owner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const ownerJson = await ownerRes.json();
      if (!ownerRes.ok) {
        throw new Error(ownerJson.error || "Failed to update owner profile");
      }

      setInitialGuardrails(guardrails);
      setInitialProfile(profile);
      setLastUpdatedDate(new Date().toLocaleString());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving changes");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/owner", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account");
      }
      router.push("/login");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error deleting account");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400 text-sm">
          <RotateCw className="w-5 h-5 animate-spin text-blue-500" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1f222e]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Account & Autonomous Guardrails
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
              Active Configuration
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Rules, profile identity, communication tone, and connected PayPal credentials.
          </p>
        </div>

        {lastUpdatedDate && (
          <span className="text-[11px] text-zinc-500 font-mono self-start sm:self-auto">
            Last updated: {lastUpdatedDate}
          </span>
        )}
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">Changes saved and applied immediately to live negotiations!</span>
          </div>
          <span className="font-mono text-[10px] bg-emerald-900/50 px-2 py-0.5 rounded">
            Persisted in Neon Postgres
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1f222e] pb-2 overflow-x-auto">
        {[
          { key: "rules", label: "Rules & Limits", icon: Sliders },
          { key: "profile", label: "Profile & Identity", icon: User },
          { key: "communication", label: "Communication Tone", icon: MessageSquare },
          { key: "account", label: "PayPal & Account", icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#181a24] text-white border border-[#2b2f42] shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#12141c]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-400" : "text-zinc-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Rules & Guardrails */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          {/* Live Plain-English Summary banner at the top of Rules */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/30 to-indigo-950/30 border border-blue-500/30 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300 block mb-0.5">
                Current Plain-English Rule Summary
              </span>
              <p className="text-xs text-zinc-200 font-sans font-medium leading-relaxed">
                &ldquo;{describeGuardrails(guardrails)}&rdquo;
              </p>
            </div>
          </div>

          <GuardrailsForm
            value={guardrails}
            onChange={setGuardrails}
            showSummaryCard={false}
            showResetButton={true}
          />
        </div>
      )}

      {/* Tab 2: Profile & Identity */}
      {activeTab === "profile" && (
        <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-6 shadow-sm space-y-5">
          <div className="border-b border-[#1d202c] pb-3">
            <h2 className="text-base font-bold text-white tracking-tight">
              Owner Profile & Notification Settings
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              How you are presented in automated emails and where escalation tickets are delivered.
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Display Name (max 60 chars)</span>
              </label>
              <input
                type="text"
                maxLength={60}
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-[#222533] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="text-[11px] text-zinc-500">
                Shown to clients in emails and reminder messages.
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
                onChange={(e) => setProfile({ ...profile, notificationEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-[#222533] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="text-[11px] text-zinc-500">
                Receives escalation notices when proposals deviate from rules or client disputes scope.
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
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-[#222533] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {supportedTimezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Communication Tone */}
      {activeTab === "communication" && (
        <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-[#1d202c] pb-3">
            <h2 className="text-base font-bold text-white tracking-tight">
              Communication Voice & Tone
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Configure how Amavi drafts payment reminders and replies to your clients.
            </p>
          </div>

          {/* Tone Selector */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-300">Tone Preset</label>
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
                        : "bg-[#0b0d13] border-[#1d202c] hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold ${isSelected ? "text-blue-300" : "text-zinc-200"}`}>
                          {meta.label}
                        </span>
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-blue-400 bg-blue-500" : "border-zinc-700"
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal mb-3">
                        {meta.description}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#06070a] border border-[#161822] text-[11px] text-zinc-300 font-sans italic">
                      <span className="text-[10px] font-bold uppercase not-italic text-zinc-500 block mb-0.5">
                        Sample Reminder:
                      </span>
                      &ldquo;{meta.example}&rdquo;
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Business Note */}
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>About your business (Optional, max 300 chars)</span>
              </label>
              <span className={`text-[11px] font-mono ${(profile.businessNote || "").length > 280 ? "text-amber-400" : "text-zinc-500"}`}>
                {(profile.businessNote || "").length}/300
              </span>
            </div>
            <textarea
              maxLength={300}
              rows={3}
              value={profile.businessNote || ""}
              onChange={(e) => setProfile({ ...profile, businessNote: e.target.value })}
              placeholder="e.g. Freelance brand & web designer. I invoice on milestones and value transparent, long-term relationships."
              className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-[#222533] rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-sans"
            />
          </div>
        </div>
      )}

      {/* Tab 4: Account & PayPal */}
      {activeTab === "account" && (
        <div className="space-y-6">
          {/* PayPal Connection Card */}
          <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#1d202c] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#003087] to-[#0079C1] flex items-center justify-center font-bold text-white shadow-sm">
                  P
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">PayPal Connection</span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Sandbox Active
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {ownerDetails.name} ({ownerDetails.email})
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151722] hover:bg-[#1d2030] border border-[#2a2f42] text-xs font-semibold text-zinc-300 hover:text-white transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>

            {/* Consent Accepted Record */}
            <div className="p-3.5 rounded-lg bg-[#090a0f] border border-[#1a1d28] text-xs text-zinc-400 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-mono text-[11px]">Consent Timestamp:</span>
                <span className="text-zinc-300 font-mono">
                  {ownerDetails.consentAcceptedAt
                    ? new Date(ownerDetails.consentAcceptedAt).toLocaleString()
                    : "Accepted during initial setup"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-mono text-[11px]">Consent Policy Version:</span>
                <span className="text-zinc-300 font-mono">
                  {ownerDetails.consentVersion || "2026-11-v1"}
                </span>
              </div>
            </div>
          </div>

          {/* Danger Zone: Delete Account */}
          <div className="bg-[#141014] border border-rose-500/20 rounded-xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-rose-400">Danger Zone</h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
              Disconnecting your account permanently deletes your guardrails, client profiles, approval tickets, and local audit logs.
            </p>

            {ownerDetails.isDemo ? (
              <p className="text-xs text-amber-400 font-mono">
                🔒 Account deletion is disabled on the shared demo workspace.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-xs font-semibold text-rose-300 hover:text-rose-100 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect and delete my data</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Save Changes Bar (Appears when dirty) */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-[#121420] border border-blue-500/40 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>You have unsaved changes.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGuardrails(initialGuardrails);
                  setProfile(initialProfile);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#191c2b] text-xs font-semibold text-zinc-400 hover:text-white transition-all"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-500/30 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{saving ? "Saving..." : "Save changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11131a] border border-[#272a38] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>Confirm Account & Data Deletion</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to disconnect? All your owner rules, guardrails, client records, and audit history will be permanently deleted from the database.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-2 rounded-lg bg-[#181a24] text-xs font-semibold text-zinc-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-all disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, delete everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
