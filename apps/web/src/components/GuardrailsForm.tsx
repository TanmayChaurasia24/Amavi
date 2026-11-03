"use client";

import React from "react";
import {
  Sliders,
  Zap,
  Shield,
  RotateCcw,
  Sparkles,
  Lock,
} from "lucide-react";
import {
  GuardrailsInput,
  DEFAULT_GUARDRAILS,
  describeGuardrails,
} from "@/lib/guardrails";

interface GuardrailsFormProps {
  value: GuardrailsInput;
  onChange: (updated: GuardrailsInput) => void;
  showSummaryCard?: boolean;
  showResetButton?: boolean;
}

export function GuardrailsForm({
  value,
  onChange,
  showSummaryCard = true,
  showResetButton = true,
}: GuardrailsFormProps) {
  const updateField = <K extends keyof GuardrailsInput>(
    key: K,
    val: GuardrailsInput[K]
  ) => {
    onChange({
      ...value,
      [key]: val,
      // Locked toggles always remain true
      escalateDisputes: true,
      escalateHardship: true,
    });
  };

  const handleResetDefaults = () => {
    onChange({ ...DEFAULT_GUARDRAILS });
  };

  // Sample $1,000 calculation for live context
  const sampleTotal = 1000;
  const sampleDeposit = (sampleTotal * (value.minDepositPct / 100)).toFixed(2);
  const sampleBalance = (sampleTotal - parseFloat(sampleDeposit)).toFixed(2);
  const sampleMaxDiscount = value.allowDiscounts
    ? (sampleTotal * (value.maxDiscountPct / 100)).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      {showResetButton && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141620] hover:bg-[#1b1f2e] border border-[#272b3c] text-xs font-medium text-zinc-300 hover:text-white transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Use recommended defaults</span>
          </button>
        </div>
      )}

      {/* 1. Payment Plan & Instalment Limits */}
      <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#1d202c] pb-3">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span>Payment Plan Boundaries</span>
        </div>

        {/* Max Instalments (NEW: 1-6) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-zinc-200">
                Maximum Number of Instalments
              </label>
              <p className="text-xs text-zinc-400 mt-0.5">
                The most instalments Settle can offer without escalating to you
              </p>
            </div>
            <span className="text-sm font-bold text-blue-400 font-mono px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              {value.maxInstalments} {value.maxInstalments === 1 ? "instalment" : "instalments"}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={value.maxInstalments}
            onChange={(e) => updateField("maxInstalments", parseInt(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
            <span>1 (Single split)</span>
            <span>3 (Recommended)</span>
            <span>6 (Maximum)</span>
          </div>
        </div>

        {/* Min Upfront Deposit % */}
        <div className="space-y-2.5 pt-4 border-t border-[#1d202c]">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-zinc-200">
                Minimum Upfront Deposit
              </label>
              <p className="text-xs text-zinc-400 mt-0.5">
                Client must pay at least this % before an instalment plan starts
              </p>
            </div>
            <span className="text-sm font-bold text-blue-400 font-mono px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              {value.minDepositPct}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={70}
            step={5}
            value={value.minDepositPct}
            onChange={(e) => updateField("minDepositPct", parseInt(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
            <span>10% (Permissive)</span>
            <span>30% (Standard)</span>
            <span>70% (Strict)</span>
          </div>
        </div>

        {/* Max Plan Duration (Days) */}
        <div className="space-y-2.5 pt-4 border-t border-[#1d202c]">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-zinc-200">
                Maximum Plan Duration
              </label>
              <p className="text-xs text-zinc-400 mt-0.5">
                Instalment plans cannot stretch beyond this many days
              </p>
            </div>
            <span className="text-sm font-bold text-blue-400 font-mono px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              {value.maxPlanDays} days
            </span>
          </div>
          <input
            type="range"
            min={14}
            max={180}
            step={7}
            value={value.maxPlanDays}
            onChange={(e) => updateField("maxPlanDays", parseInt(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
            <span>14 days</span>
            <span>60 days (Recommended)</span>
            <span>180 days</span>
          </div>
        </div>
      </div>

      {/* 2. Discounts & Auto-Approve Threshold */}
      <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#1d202c] pb-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Discounts & Approval Threshold</span>
        </div>

        {/* Allow Discounts Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-zinc-200">
              Allow Immediate Settlement Discounts
            </label>
            <p className="text-xs text-zinc-400 mt-0.5">
              Permit Settle to offer a discount if client clears the invoice within 48 hours
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value.allowDiscounts}
              onChange={(e) => updateField("allowDiscounts", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Max Discount % (conditional) */}
        {value.allowDiscounts && (
          <div className="space-y-2.5 pt-4 border-t border-[#1d202c] animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-zinc-200">
                  Maximum Discount Percentage
                </label>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Cap on discounts offered autonomously for immediate settlement
                </p>
              </div>
              <span className="text-sm font-bold text-amber-400 font-mono px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                {value.maxDiscountPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={25}
              step={1}
              value={value.maxDiscountPct}
              onChange={(e) => updateField("maxDiscountPct", parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
              <span>0%</span>
              <span>10% (Standard)</span>
              <span>25% (Max cap)</span>
            </div>
          </div>
        )}

        {/* Auto-Approve Threshold in Dollars */}
        <div className="pt-4 border-t border-[#1d202c] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-200">
              Auto-Approve Threshold ($)
            </label>
            <span className="text-xs text-zinc-400 font-mono">
              Up to $10,000
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-zinc-400 font-mono text-sm">
              $
            </span>
            <input
              type="number"
              min={0}
              max={10000}
              step={50}
              value={value.autoApproveThresholdCents / 100}
              onChange={(e) => {
                const dollars = Math.max(0, Math.min(10000, parseFloat(e.target.value || "0")));
                updateField("autoApproveThresholdCents", Math.round(dollars * 100));
              }}
              className="w-full pl-8 pr-4 py-2 bg-[#090a0f] border border-[#222533] rounded-lg text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Invoices above ${(value.autoApproveThresholdCents / 100).toFixed(2)} always need your approval in the queue.
          </p>
        </div>
      </div>

      {/* 3. Locked Escalation Toggles (Core Safety Principle) */}
      <div className="bg-[#11131a] border border-[#1f222e] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#1d202c] pb-3">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Safety Guardrails</span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Always Locked On
          </span>
        </div>

        {/* Locked Dispute Row */}
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200">
                Client disputes: always sent to you
              </span>
              <Lock className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Halt automated bot negotiations and file an owner review ticket if deliverables or scope are disputed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-11 h-6 bg-blue-600/60 rounded-full flex items-center justify-end px-1 cursor-not-allowed opacity-80" title="Always on for your protection.">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Locked Hardship Row */}
        <div className="flex items-center justify-between py-1 pt-3 border-t border-[#1d202c]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200">
                Financial hardship: always sent to you
              </span>
              <Lock className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Route directly to you if the client reports emergency distress, insolvency, or severe cash shortfall
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-11 h-6 bg-blue-600/60 rounded-full flex items-center justify-end px-1 cursor-not-allowed opacity-80" title="Always on for your protection.">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live Plain-English Summary Card */}
      {showSummaryCard && (
        <div className="bg-gradient-to-br from-[#121422] to-[#0c0d16] border border-blue-500/30 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-blue-300 font-semibold text-xs tracking-wider uppercase">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Active Policy Summary</span>
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed font-sans font-medium">
            &ldquo;{describeGuardrails(value)}&rdquo;
          </p>
          <div className="pt-2 border-t border-blue-500/20 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-zinc-400">
            <div>
              <span className="text-zinc-500 block text-[10px]">Sample $1k Deposit:</span>
              <span className="text-blue-400 font-semibold">${sampleDeposit}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Remaining Balance:</span>
              <span className="text-zinc-200 font-semibold">${sampleBalance}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Max Duration:</span>
              <span className="text-zinc-200 font-semibold">{value.maxPlanDays}d</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Instant Discount:</span>
              <span className="text-amber-400 font-semibold">
                {value.allowDiscounts ? `$${sampleMaxDiscount} (${value.maxDiscountPct}%)` : "Off"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

