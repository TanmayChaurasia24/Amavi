import { z } from "zod";

// ─── Consent ──────────────────────────────────────────────────────────────────
export const CONSENT_VERSION = "2026-11-v1";
export const CONSENT_TEXT =
  "I authorize Amavi to send payment reminders and replies to my clients on my behalf. " +
  "I understand replies are drafted by AI within the rules I set, that disputes and hardship cases are always sent to me, " +
  "and that this prototype runs in PayPal Sandbox (no real money moves).";

// ─── Guardrails Schema ────────────────────────────────────────────────────────
/**
 * Single source of truth for all guardrail validation.
 * Used by: onboarding wizard, settings page, API routes, and the AI agent's server-side checks.
 *
 * LOCKED FIELDS: escalateDisputes and escalateHardship are always true.
 * The server calls normalizeGuardrails() before any save to strictly enforce this.
 */
export const guardrailsSchema = z.object({
  minDepositPct: z
    .number()
    .int("Must be a whole number")
    .min(10, "Minimum deposit must be at least 10%")
    .max(70, "Minimum deposit cannot exceed 70%"),
  maxPlanDays: z
    .number()
    .int("Must be a whole number")
    .min(14, "Plan duration must be at least 14 days")
    .max(180, "Plan duration cannot exceed 180 days"),
  maxInstalments: z
    .number()
    .int("Must be a whole number")
    .min(1, "Must allow at least 1 instalment")
    .max(6, "Cannot exceed 6 instalments"),
  allowDiscounts: z.boolean(),
  maxDiscountPct: z
    .number()
    .int("Must be a whole number")
    .min(0)
    .max(25, "Discount cannot exceed 25%"),
  autoApproveThresholdCents: z
    .number()
    .int("Must be a whole number")
    .min(0)
    .max(1000000, "Cannot exceed $10,000"),
  // Locked rows: always true. Transform overrides any false value.
  escalateDisputes: z.boolean().transform(() => true),
  escalateHardship: z.boolean().transform(() => true),
});

export type GuardrailsInput = z.input<typeof guardrailsSchema>;
export type Guardrails = z.output<typeof guardrailsSchema>;

export const DEFAULT_GUARDRAILS: GuardrailsInput = {
  minDepositPct: 30,
  maxPlanDays: 60,
  maxInstalments: 3,
  allowDiscounts: false,
  maxDiscountPct: 0,
  autoApproveThresholdCents: 50000, // $500.00
  escalateDisputes: true,
  escalateHardship: true,
};

/**
 * Always call this before persisting guardrails.
 * Forces the two locked toggles to true regardless of what the client sent.
 */
export function normalizeGuardrails(input: GuardrailsInput): Guardrails {
  const parsed = guardrailsSchema.parse(input);
  return {
    ...parsed,
    escalateDisputes: true,
    escalateHardship: true,
  };
}

/**
 * Returns a plain-English summary of the active guardrails.
 * Example: "Amavi may offer up to 3 instalments over 60 days, with at least 30% upfront
 * and no discounts. Invoices over $500 need your approval. Disputes and hardship always come to you."
 */
export function describeGuardrails(g: Guardrails | GuardrailsInput): string {
  const thresholdDollars = (g.autoApproveThresholdCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const discountPart = g.allowDiscounts
    ? `up to ${g.maxDiscountPct}% discount for immediate settlement`
    : "no discounts";

  return (
    `Amavi may offer up to ${g.maxInstalments} instalment${g.maxInstalments !== 1 ? "s" : ""} ` +
    `over ${g.maxPlanDays} days, with at least ${g.minDepositPct}% upfront and ${discountPart}. ` +
    `Invoices over ${thresholdDollars} need your approval. ` +
    `Disputes and hardship always come to you.`
  );
}

// ─── Profile Schema ───────────────────────────────────────────────────────────
export const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(60, "Display name must be 60 characters or fewer"),
  notificationEmail: z
    .string()
    .email("Must be a valid email address"),
  timezone: z
    .string()
    .min(1, "Timezone is required"),
  tone: z.enum(["friendly", "neutral", "firm"]),
  businessNote: z
    .string()
    .max(300, "Business note must be 300 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type Profile = z.output<typeof profileSchema>;

// ─── Onboarding Complete Payload ──────────────────────────────────────────────
export const onboardingCompleteSchema = z.object({
  profile: profileSchema,
  guardrails: guardrailsSchema,
  consentAccepted: z.literal(true, {
    message: "You must accept the terms to continue",
  }),
});

export type OnboardingComplete = z.input<typeof onboardingCompleteSchema>;

// ─── Tone Examples (Used in onboarding Step 3) ────────────────────────────────
export const TONE_EXAMPLES = {
  friendly: {
    label: "Friendly",
    description: "Warm and collaborative. Best for long-term client relationships.",
    example:
      "Hi Sarah! Just a quick note — your invoice for $1,200 is a little overdue. Let me know if you'd like to set up a payment plan — happy to work something out!",
  },
  neutral: {
    label: "Neutral",
    description: "Professional and matter-of-fact. Good for most business contexts.",
    example:
      "This is a reminder that invoice #INV-1042 for $1,200 is now past due. Please arrange payment at your earliest convenience or contact us to discuss options.",
  },
  firm: {
    label: "Firm",
    description: "Direct and formal. Appropriate for repeated non-payment.",
    example:
      "Invoice #INV-1042 for $1,200 remains unpaid and is now overdue. Payment is required within 5 business days or this account will be referred for further action.",
  },
} as const;

