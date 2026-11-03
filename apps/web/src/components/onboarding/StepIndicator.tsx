"use client";

import React from "react";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number; // 0, 1, 2
  steps: string[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Background connecting track */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-[#1f222e] z-0" />
        {/* Active colored track */}
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 z-0 transition-all duration-300"
          style={{
            width: `${(currentStep / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((label, idx) => {
          const isDone = idx < currentStep;
          const isActive = idx === currentStep;

          return (
            <div key={label} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border-2 ${
                  isDone
                    ? "bg-blue-600 border-blue-500 text-white"
                    : isActive
                    ? "bg-[#0c0d14] border-blue-400 text-blue-400 ring-4 ring-blue-500/20"
                    : "bg-[#11131a] border-[#222533] text-zinc-500"
                }`}
              >
                {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
              </div>
              <span
                className={`mt-2 text-[11px] font-medium transition-colors hidden sm:block ${
                  isActive
                    ? "text-blue-400 font-semibold"
                    : isDone
                    ? "text-zinc-300"
                    : "text-zinc-500"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

