import { z } from "zod";

// ─── Intent Types ─────────────────────────────────────────────────────────────
export const MessageIntentSchema = z.enum([
  "PROMISE_TO_PAY",
  "REQUEST_INSTALMENT",
  "DISPUTE",
  "HARDSHIP",
  "OTHER",
]);

export type MessageIntent = z.infer<typeof MessageIntentSchema>;

// ─── Extracted Proposal Schema ────────────────────────────────────────────────
export const ExtractedProposalSchema = z.object({
  depositCents: z.number().int().nonnegative().nullable(),
  depositPct: z.number().min(0).max(100).nullable(),
  instalmentCount: z.number().int().positive().nullable(),
  durationDays: z.number().int().positive().nullable(),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).nullable(),
  discountPct: z.number().min(0).max(100).nullable(),
  promiseDate: z.string().nullable(), // YYYY-MM-DD
});

export type ExtractedProposal = z.infer<typeof ExtractedProposalSchema>;

// ─── Classification Result ────────────────────────────────────────────────────
export const ClassificationResultSchema = z.object({
  intent: MessageIntentSchema,
  confidence: z.number().min(0).max(1),
  proposal: ExtractedProposalSchema,
  isPromptInjectionAttempt: z.boolean(),
  clientSummary: z.string(),
  suggestedReply: z.string(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

// ─── Guardrail Validation Result ──────────────────────────────────────────────
export interface GuardrailValidationResult {
  passed: boolean;
  requiresApproval: boolean;
  violations: string[];
  depositCents: number;
  depositPct: number;
  remainingCents: number;
  durationDays: number;
  instalmentCount: number;
  instalmentAmountCents: number;
  discountPct: number;
  discountAmountCents: number;
  reason: string;
}

// ─── Payment Plan Generation Result ───────────────────────────────────────────
export interface PlanInstalmentScheduleItem {
  instalmentNumber: number;
  amountCents: number;
  dueDate: string; // YYYY-MM-DD
  paypalInvoiceId?: string | null;
  status: "PENDING" | "PAID" | "OVERDUE";
}

export interface PaymentPlanResult {
  planId: string;
  invoiceId: string;
  totalCents: number;
  depositCents: number;
  instalmentCount: number;
  durationDays: number;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  instalments: PlanInstalmentScheduleItem[];
  depositInvoiceId: string | null;
  payerViewUrl: string | null;
}

// ─── Escalation Result ────────────────────────────────────────────────────────
export interface EscalationResult {
  ticketId: string;
  invoiceId: string;
  status: "PENDING";
  reason: string;
  proposalSummary: string;
}

// ─── Agent Run Result ─────────────────────────────────────────────────────────
export interface AgentRunResult {
  invoiceId: string;
  intent: MessageIntent;
  confidence: number;
  isPromptInjectionAttempt: boolean;
  actionTaken: "PLAN_CREATED" | "ESCALATED" | "PROMISE_RECORDED" | "REMINDER_SENT" | "IGNORED";
  plan?: PaymentPlanResult;
  escalationTicketId?: string;
  violations?: string[];
  replyText: string;
  executionTimeMs: number;
}
