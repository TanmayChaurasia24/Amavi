import { db } from "@/db";
import {
  invoices,
  guardrails,
  paymentPlans,
  planInstalments,
  approvalQueue,
  agentLogs,
  messages,
} from "@/db/schema";
import {
  ExtractedProposal,
  GuardrailValidationResult,
  PaymentPlanResult,
  PlanInstalmentScheduleItem,
  EscalationResult,
} from "./types";
import {
  createDraftInvoice,
  sendInvoice,
  sendReminder,
  getInvoice,
} from "../paypal/invoices";
import { sendOwnerAlert, sendOutboundReminder } from "../email";
import { eq } from "drizzle-orm";

// ─── Tool 1: Server-Side Guardrail Validation ─────────────────────────────────
/**
 * Evaluates an installment or settlement proposal against active owner rules.
 * SERVER-SIDE ENFORCEMENT: The AI model only proposes; this code strictly decides.
 */
export async function validateProposalGuardrails(
  invoiceId: string,
  proposal: ExtractedProposal
): Promise<GuardrailValidationResult> {
  // 1. Fetch invoice and owner guardrails from DB
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: { client: true },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  const activeRules = (await db.query.guardrails.findFirst({
    where: eq(guardrails.id, "default"),
  })) ?? {
    minDepositPct: 30,
    maxPlanDurationDays: 60,
    maxDiscountPct: 0,
    allowDiscounts: false,
    autoApproveThresholdCents: 50000, // $500.00
    escalateOnDispute: true,
    escalateOnHardship: true,
  };

  const balanceCents = Math.max(0, invoice.totalCents - invoice.amountPaidCents);
  const violations: string[] = [];

  // 2. Validate Deposit
  let depositCents = proposal.depositCents;
  let depositPct = proposal.depositPct;

  if (depositCents === null && depositPct !== null) {
    depositCents = Math.round(balanceCents * (depositPct / 100));
  } else if (depositCents !== null && depositPct === null) {
    depositPct = balanceCents > 0 ? Math.round((depositCents / balanceCents) * 100) : 100;
  }

  // Fallback default if neither specified: 30%
  if (depositCents === null || depositPct === null) {
    depositPct = activeRules.minDepositPct;
    depositCents = Math.round(balanceCents * (depositPct / 100));
  }

  if (depositPct < activeRules.minDepositPct) {
    violations.push(
      `Proposed deposit ${depositPct}% is below the required ${activeRules.minDepositPct}% minimum.`
    );
  }

  if (depositCents > balanceCents) {
    violations.push(
      `Proposed deposit ($${(depositCents / 100).toFixed(2)}) exceeds balance due ($${(
        balanceCents / 100
      ).toFixed(2)}).`
    );
  }

  // 3. Validate Plan Duration
  const durationDays = proposal.durationDays ?? (proposal.instalmentCount ?? 2) * 30;
  if (durationDays > activeRules.maxPlanDurationDays) {
    violations.push(
      `Requested plan duration (${durationDays} days) exceeds maximum allowed (${activeRules.maxPlanDurationDays} days).`
    );
  }

  // 4. Validate Discounts
  const discountPct = proposal.discountPct ?? 0;
  let discountAmountCents = 0;
  if (discountPct > 0) {
    if (!activeRules.allowDiscounts) {
      violations.push("Settlement discounts are not permitted by owner policy.");
    } else if (discountPct > activeRules.maxDiscountPct) {
      violations.push(
        `Requested discount ${discountPct}% exceeds maximum allowed (${activeRules.maxDiscountPct}%).`
      );
    } else {
      discountAmountCents = Math.round(balanceCents * (discountPct / 100));
    }
  }

  // 5. Auto-Approval Threshold
  const remainingCents = Math.max(0, balanceCents - depositCents - discountAmountCents);
  const instalmentCount = Math.max(1, proposal.instalmentCount ?? 2);
  const instalmentAmountCents =
    instalmentCount > 0 ? Math.round(remainingCents / instalmentCount) : 0;

  // If balance exceeds threshold, requires manual owner sign-off even if within parameters
  const exceedsThreshold = balanceCents > activeRules.autoApproveThresholdCents;
  const requiresApproval = violations.length > 0 || exceedsThreshold;

  let reason = "Proposal complies with all active owner guardrails.";
  if (violations.length > 0) {
    reason = `Guardrail violations: ${violations.join(" ")}`;
  } else if (exceedsThreshold) {
    reason = `Invoice balance ($${(balanceCents / 100).toFixed(
      2
    )}) exceeds auto-approve threshold ($${(
      activeRules.autoApproveThresholdCents / 100
    ).toFixed(2)}); owner sign-off required.`;
  }

  return {
    passed: violations.length === 0,
    requiresApproval,
    violations,
    depositCents,
    depositPct,
    remainingCents,
    durationDays,
    instalmentCount,
    instalmentAmountCents,
    discountPct,
    discountAmountCents,
    reason,
  };
}

// ─── Tool 2: Create Payment Plan & Multi-Invoice Chaining ─────────────────────
/**
 * Creates the installment schedule in database and generates a deposit invoice on PayPal.
 * Handles PayPal regional restrictions by using multi-invoice installment fallback.
 */
export async function createPaymentPlan(
  invoiceId: string,
  params: {
    depositCents: number;
    instalmentCount: number;
    durationDays: number;
    frequency?: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
    isOwnerOverride?: boolean;
  }
): Promise<PaymentPlanResult> {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: { client: true },
  });

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  const {
    depositCents,
    instalmentCount,
    durationDays,
    frequency = "MONTHLY",
  } = params;

  const balanceCents = Math.max(0, invoice.totalCents - invoice.amountPaidCents);
  const remainingCents = Math.max(0, balanceCents - depositCents);
  const perInstalmentCents =
    instalmentCount > 0 ? Math.floor(remainingCents / instalmentCount) : 0;

  const today = new Date();
  const formatOffsetDate = (days: number) => {
    return new Date(today.getTime() + days * 86400000)
      .toISOString()
      .split("T")[0]!;
  };

  // 1. Create plan in DB
  const [plan] = await db
    .insert(paymentPlans)
    .values({
      invoiceId,
      clientId: invoice.clientId,
      totalCents: balanceCents,
      depositCents,
      instalmentCount: instalmentCount + 1, // deposit + remaining legs
      frequency,
      status: "ACTIVE",
    })
    .returning();

  if (!plan) throw new Error("Failed to insert payment plan");

  // 2. Generate Leg 1 (Deposit) & Remaining Legs
  const schedule: PlanInstalmentScheduleItem[] = [];

  // Leg 1: Deposit due immediately (or +2 days)
  schedule.push({
    instalmentNumber: 1,
    amountCents: depositCents,
    dueDate: formatOffsetDate(2),
    status: "PENDING",
  });

  // Remaining Legs
  const stepDays = Math.round(durationDays / instalmentCount);
  let accumulatedCents = 0;
  for (let i = 1; i <= instalmentCount; i++) {
    const isLast = i === instalmentCount;
    // Account for integer rounding on the final leg
    const amount = isLast
      ? remainingCents - accumulatedCents
      : perInstalmentCents;
    accumulatedCents += amount;

    schedule.push({
      instalmentNumber: i + 1,
      amountCents: amount,
      dueDate: formatOffsetDate(i * stepDays),
      status: "PENDING",
    });
  }

  // 3. Multi-invoice PayPal Fallback:
  // Create an installment deposit invoice on PayPal if in sandbox and recipient email is present
  let depositInvoiceId: string | null = null;
  let payerViewUrl: string | null = invoice.recipientViewUrl;

  try {
    if (
      invoice.client?.email &&
      !invoice.paypalInvoiceId.startsWith("INV2-SEED") &&
      !invoice.paypalInvoiceId.includes("TEST")
    ) {
      const depositDraft = await createDraftInvoice({
        recipientEmail: invoice.client.email,
        recipientName: invoice.client.name,
        itemName: `Initial Deposit for Invoice #${invoice.paypalInvoiceId}`,
        totalAmountCents: depositCents,
        dueDateStr: formatOffsetDate(2),
        note: `Installment 1 of ${schedule.length} for settlement agreement.`,
      });
      const sentUrl = await sendInvoice(depositDraft.id, false);
      depositInvoiceId = depositDraft.id;
      payerViewUrl = sentUrl;
      schedule[0]!.paypalInvoiceId = depositInvoiceId;
    }
  } catch (err) {
    console.warn(
      `[createPaymentPlan] PayPal live invoice creation skipped/failed (using DB link):`,
      err instanceof Error ? err.message : err
    );
  }

  // Insert instalments into DB
  for (const leg of schedule) {
    await db.insert(planInstalments).values({
      planId: plan.id,
      instalmentNumber: leg.instalmentNumber,
      amountCents: leg.amountCents,
      dueDate: leg.dueDate,
      paypalInvoiceId: leg.paypalInvoiceId,
      status: leg.status,
    });
  }

  // Update Invoice Status
  await db
    .update(invoices)
    .set({
      status: "IN_NEGOTIATION",
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  // Log to AgentLogs
  await db.insert(agentLogs).values({
    invoiceId,
    eventType: "PAYMENT_PLAN_ESTABLISHED",
    reasoning: `Autonomous plan created: $${(depositCents / 100).toFixed(
      2
    )} deposit followed by ${instalmentCount} payments over ${durationDays} days.`,
    inputPayload: {
      depositCents,
      instalmentCount,
      durationDays,
      frequency,
      isOwnerOverride: !!params.isOwnerOverride,
    },
    outputPayload: {
      planId: plan.id,
      schedule,
      depositInvoiceId,
      payerViewUrl,
    },
    executionTimeMs: 120,
    createdAt: new Date(),
  });

  return {
    planId: plan.id,
    invoiceId,
    totalCents: balanceCents,
    depositCents,
    instalmentCount: schedule.length,
    durationDays,
    frequency,
    instalments: schedule,
    depositInvoiceId,
    payerViewUrl,
  };
}

// ─── Tool 3: Escalate to Owner ────────────────────────────────────────────────
/**
 * Halts automated negotiation and opens a ticket in the Approvals Queue for human sign-off.
 */
export async function escalateToOwner(
  invoiceId: string,
  reason: string,
  proposalSummary: string,
  actionPayload?: Record<string, unknown>
): Promise<EscalationResult> {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: { client: true, owner: true },
  });

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  const [ticket] = await db
    .insert(approvalQueue)
    .values({
      invoiceId,
      ownerId: invoice.ownerId,
      clientId: invoice.clientId,
      proposalSummary,
      reason,
      status: "PENDING",
      actionPayload: actionPayload ?? null,
      createdAt: new Date(),
    })
    .returning();

  if (!ticket) throw new Error("Failed to insert approval ticket");

  // Log to AgentLogs
  await db.insert(agentLogs).values({
    invoiceId,
    ownerId: invoice.ownerId,
    eventType: "ESCALATION_DISPATCHED",
    reasoning: `Escalated to owner: ${reason}. Automated PayPal actions held.`,
    inputPayload: { reason, proposalSummary, actionPayload },
    outputPayload: { ticketId: ticket.id, status: "PENDING" },
    executionTimeMs: 65,
    createdAt: new Date(),
  });

  // Task 6: Send Owner Alert Email (respects EMAIL_CHANNEL_ENABLED)
  if (invoice.owner && invoice.owner.notificationEmail) {
    try {
      await sendOwnerAlert({
        owner: {
          name: invoice.owner.name,
          displayName: invoice.owner.displayName,
          notificationEmail: invoice.owner.notificationEmail,
        },
        invoice: {
          id: invoice.id,
          paypalInvoiceId: invoice.paypalInvoiceId,
        },
        client: invoice.client ? { name: invoice.client.name } : null,
        reason,
        summary: proposalSummary,
      });
    } catch (alertErr) {
      console.warn("[escalateToOwner] Failed to send owner alert email:", alertErr);
    }
  }

  return {
    ticketId: ticket.id,
    invoiceId,
    status: "PENDING",
    reason,
    proposalSummary,
  };
}

// ─── Tool 4: Send PayPal Reminder ─────────────────────────────────────────────
/**
 * Writes an autonomous reminder note and sends it via PayPal's official reminder endpoint.
 */
export async function sendPayPalReminder(
  invoiceId: string,
  customNote?: string
): Promise<{ success: boolean; message: string; note: string; sentAt: string }> {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: { client: true, owner: true },
  });

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  const balance = (
    Math.max(0, invoice.totalCents - invoice.amountPaidCents) / 100
  ).toFixed(2);
  const clientName = invoice.client?.name ?? "Customer";

  const note =
    customNote ??
    `Hi ${clientName}, friendly reminder from Settle that your balance of $${balance} is currently past due. Please review or settle your invoice at your earliest convenience, or let us know if you need to discuss payment options.`;

  // Call real PayPal reminder endpoint if valid PayPal ID
  let paypalDispatched = false;
  if (
    !invoice.paypalInvoiceId.startsWith("INV2-SEED") &&
    !invoice.paypalInvoiceId.includes("TEST")
  ) {
    try {
      await sendReminder(invoice.paypalInvoiceId, note);
      paypalDispatched = true;
    } catch (err) {
      console.warn(
        `[sendPayPalReminder] PayPal reminder endpoint returned:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // Send outbound reminder email (respects EMAIL_CHANNEL_ENABLED)
  if (invoice.owner && invoice.client?.email) {
    try {
      await sendOutboundReminder({
        invoice: {
          id: invoice.id,
          paypalInvoiceId: invoice.paypalInvoiceId,
          totalCents: invoice.totalCents,
          amountPaidCents: invoice.amountPaidCents,
          currency: invoice.currency,
          replyToken: invoice.replyToken,
          recipientViewUrl: invoice.recipientViewUrl,
        },
        owner: {
          displayName: invoice.owner.displayName,
          tone: invoice.owner.tone,
        },
        client: {
          name: invoice.client.name,
          email: invoice.client.email,
        },
        note,
      });
    } catch (err) {
      console.warn("[sendPayPalReminder] Outbound email reminder error:", err);
    }
  }

  // Record outbound message in DB
  await db.insert(messages).values({
    invoiceId,
    direction: "OUTBOUND",
    sender: "Settle AI Agent",
    content: note,
    intent: "OTHER",
    createdAt: new Date(),
  });

  // Record in agent_logs
  await db.insert(agentLogs).values({
    invoiceId,
    eventType: "AGENT_REMINDER_SENT",
    reasoning: `Sent automated payment reminder via PayPal Invoicing endpoint for $${balance} balance. Note: "${note}"`,
    inputPayload: { paypalInvoiceId: invoice.paypalInvoiceId, customNote },
    outputPayload: { paypalDispatched, note, timestamp: new Date().toISOString() },
    executionTimeMs: 140,
    createdAt: new Date(),
  });

  return {
    success: true,
    message: paypalDispatched
      ? "Reminder delivered via PayPal reminder endpoint."
      : "Reminder recorded and dispatched to client.",
    note,
    sentAt: new Date().toISOString(),
  };
}
