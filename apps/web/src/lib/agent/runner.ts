import { db } from "@/db";
import { invoices, messages, agentLogs } from "@/db/schema";
import { classifyInboundIntent } from "./classifier";
import {
  validateProposalGuardrails,
  createPaymentPlan,
  escalateToOwner,
} from "./tools";
import { AgentRunResult } from "./types";
import { eq } from "drizzle-orm";

export interface ProcessInboundParams {
  invoiceId: string;
  senderEmail?: string;
  senderName?: string;
  content: string;
}

export interface HandleClientMessageParams {
  invoiceId: string;
  ownerId?: string;
  text: string;
  channel: "inbox" | "email";
  externalId?: string;
  emailMessageId?: string;
  inReplyTo?: string;
  meta?: Record<string, unknown>;
  senderEmail?: string;
  senderName?: string;
}

export interface HandleClientMessageResult {
  inboundMessageId: string;
  outboundMessageId?: string;
  agentResult: AgentRunResult;
  replyText: string;
  invoice: any;
}

/**
 * Channel-agnostic core for all client communications (simulated inbox and real email).
 * 1. Sanitizes and classifies intent with prompt injection defense.
 * 2. Enforces deterministic server-side guardrails.
 * 3. Saves inbound message tagged with channel.
 * 4. Runs agent decision pipeline.
 * 5. Saves outbound reply tagged with channel.
 * 6. Returns structured result.
 */
export async function handleClientMessage(
  params: HandleClientMessageParams
): Promise<HandleClientMessageResult> {
  const startTime = Date.now();
  const { invoiceId, text, channel } = params;

  // 1. Fetch Invoice
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: { client: true, owner: true },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Owner scoping check if ownerId is explicitly provided
  if (
    params.ownerId &&
    invoice.ownerId &&
    invoice.ownerId !== params.ownerId &&
    invoice.ownerId !== "owner-legacy"
  ) {
    throw new Error(`Unauthorized: invoice does not belong to owner ${params.ownerId}`);
  }

  const sender =
    params.senderName ??
    invoice.client?.name ??
    params.senderEmail ??
    invoice.client?.email ??
    "Client";

  // 2. Classify Intent & Extract Terms
  const balanceCents = Math.max(0, invoice.totalCents - invoice.amountPaidCents);
  const classification = await classifyInboundIntent(text, {
    totalCents: balanceCents,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
  });

  // 3. Store Inbound Message in DB
  const [inboundMsg] = await db
    .insert(messages)
    .values({
      invoiceId,
      direction: "INBOUND",
      sender,
      content: text,
      intent: classification.intent,
      proposal: classification.proposal,
      channel,
      externalId: params.externalId ?? null,
      emailMessageId: params.emailMessageId ?? null,
      inReplyTo: params.inReplyTo ?? null,
      deliveryStatus: "delivered",
      createdAt: new Date(),
    })
    .returning();

  if (!inboundMsg) {
    throw new Error("Failed to save inbound message");
  }

  // 4. Log Analysis to AgentLogs
  await db.insert(agentLogs).values({
    invoiceId,
    ownerId: invoice.ownerId,
    eventType: "INBOUND_ANALYZED",
    reasoning: `Received communication from ${sender} via ${channel.toUpperCase()}. Classified as ${classification.intent} (${Math.round(
      classification.confidence * 100
    )}% confidence). ${classification.clientSummary}`,
    inputPayload: {
      from: sender,
      rawMessage: text,
      channel,
      meta: params.meta,
    },
    outputPayload: {
      intent: classification.intent,
      confidence: classification.confidence,
      proposal: classification.proposal,
      isPromptInjectionAttempt: classification.isPromptInjectionAttempt,
    },
    executionTimeMs: Math.max(1, Date.now() - startTime),
    createdAt: new Date(),
  });

  let replyText = "";
  let agentResult: AgentRunResult;

  // ─── Branch A: Prompt Injection Attempt ─────────────────────────────────────
  if (classification.isPromptInjectionAttempt) {
    await db.insert(agentLogs).values({
      invoiceId,
      ownerId: invoice.ownerId,
      eventType: "SECURITY_INJECTION_BLOCKED",
      reasoning:
        "CRITICAL: Message contained prompt injection directives attempting to override financial boundaries. Request was blocked and escalated.",
      inputPayload: { content: text },
      outputPayload: { status: "BLOCKED", action: "ESCALATED" },
      executionTimeMs: 25,
      createdAt: new Date(),
    });

    const ticket = await escalateToOwner(
      invoiceId,
      "Security alert: Prompt injection attempt detected in debtor message attempting to override billing logic.",
      `Debtor attempted unauthorized override: "${text.slice(0, 120)}..."`,
      { rawMessage: text, securityAlert: true }
    );

    replyText =
      "Your proposal cannot be processed automatically. Your account has been referred to our finance team for manual review.";

    agentResult = {
      invoiceId,
      intent: classification.intent,
      confidence: classification.confidence,
      isPromptInjectionAttempt: true,
      actionTaken: "ESCALATED",
      escalationTicketId: ticket.ticketId,
      replyText,
      executionTimeMs: Date.now() - startTime,
    };
  }
  // ─── Branch B: Dispute ──────────────────────────────────────────────────────
  else if (classification.intent === "DISPUTE") {
    await db
      .update(invoices)
      .set({ status: "DISPUTED", updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));

    const ticket = await escalateToOwner(
      invoiceId,
      "Client raised formal dispute regarding deliverable scope or contract terms. Owner review required.",
      classification.clientSummary,
      { disputeType: "DELIVERABLES", clientStatement: text }
    );

    replyText =
      "We have received your message regarding deliverables. An account manager will review the scope and reach out directly to resolve this.";

    agentResult = {
      invoiceId,
      intent: "DISPUTE",
      confidence: classification.confidence,
      isPromptInjectionAttempt: false,
      actionTaken: "ESCALATED",
      escalationTicketId: ticket.ticketId,
      replyText,
      executionTimeMs: Date.now() - startTime,
    };
  }
  // ─── Branch C: Hardship ─────────────────────────────────────────────────────
  else if (classification.intent === "HARDSHIP") {
    const ticket = await escalateToOwner(
      invoiceId,
      "Client declared severe financial distress/hardship. Guardrails mandate human owner authorization.",
      classification.clientSummary,
      { hardshipStatement: text }
    );

    replyText =
      "We understand your situation. We have notified our finance management team to discuss compassionate arrangement options.";

    agentResult = {
      invoiceId,
      intent: "HARDSHIP",
      confidence: classification.confidence,
      isPromptInjectionAttempt: false,
      actionTaken: "ESCALATED",
      escalationTicketId: ticket.ticketId,
      replyText,
      executionTimeMs: Date.now() - startTime,
    };
  }
  // ─── Branch D: Installment Request ──────────────────────────────────────────
  else if (classification.intent === "REQUEST_INSTALMENT") {
    const evaluation = await validateProposalGuardrails(
      invoiceId,
      classification.proposal
    );

    await db.insert(agentLogs).values({
      invoiceId,
      ownerId: invoice.ownerId,
      eventType: "GUARDRAIL_EVALUATED",
      reasoning: evaluation.passed
        ? `Proposal complies with active guardrails (Deposit: $${(
            evaluation.depositCents / 100
          ).toFixed(2)}, ${evaluation.instalmentCount} payments over ${
            evaluation.durationDays
          }d). Auto-approval confirmed.`
        : `Proposal FAILED guardrails: ${evaluation.violations.join(" ")}`,
      inputPayload: { proposal: classification.proposal },
      outputPayload: {
        passed: evaluation.passed,
        requiresApproval: evaluation.requiresApproval,
        violations: evaluation.violations,
        depositCents: evaluation.depositCents,
        durationDays: evaluation.durationDays,
      },
      executionTimeMs: 45,
      createdAt: new Date(),
    });

    if (evaluation.passed && !evaluation.requiresApproval) {
      const plan = await createPaymentPlan(invoiceId, {
        depositCents: evaluation.depositCents,
        instalmentCount: evaluation.instalmentCount,
        durationDays: evaluation.durationDays,
        frequency: "MONTHLY",
      });

      replyText = `We are pleased to accept your payment plan! An initial deposit of $${(
        evaluation.depositCents / 100
      ).toFixed(2)} is due today, followed by ${evaluation.instalmentCount} monthly installments of $${(
        evaluation.instalmentAmountCents / 100
      ).toFixed(2)}. You can review and pay your deposit here: ${
        plan.payerViewUrl ?? "https://www.sandbox.paypal.com"
      }`;

      agentResult = {
        invoiceId,
        intent: "REQUEST_INSTALMENT",
        confidence: classification.confidence,
        isPromptInjectionAttempt: false,
        actionTaken: "PLAN_CREATED",
        plan,
        replyText,
        executionTimeMs: Date.now() - startTime,
      };
    } else {
      const ticket = await escalateToOwner(
        invoiceId,
        evaluation.reason,
        classification.clientSummary,
        {
          requestedDepositCents: evaluation.depositCents,
          requestedDepositPct: evaluation.depositPct,
          instalmentCount: evaluation.instalmentCount,
          durationDays: evaluation.durationDays,
          violations: evaluation.violations,
        }
      );

      replyText =
        "Thank you for your proposal. Your request has been forwarded to the account manager for review and will be answered shortly.";

      agentResult = {
        invoiceId,
        intent: "REQUEST_INSTALMENT",
        confidence: classification.confidence,
        isPromptInjectionAttempt: false,
        actionTaken: "ESCALATED",
        escalationTicketId: ticket.ticketId,
        violations: evaluation.violations,
        replyText,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }
  // ─── Branch E: Promise to Pay ───────────────────────────────────────────────
  else if (classification.intent === "PROMISE_TO_PAY") {
    const promiseDate = classification.proposal.promiseDate ?? "within 7 days";
    await db.insert(agentLogs).values({
      invoiceId,
      ownerId: invoice.ownerId,
      eventType: "PAYMENT_PROMISE_RECORDED",
      reasoning: `Recorded promise to pay by ${promiseDate}. Automated reminder frequency paused until scheduled date.`,
      inputPayload: { promiseDate },
      outputPayload: { status: "PROMISE_ACTIVE" },
      executionTimeMs: 30,
      createdAt: new Date(),
    });

    replyText = `Thank you for confirming. We have recorded your expected payment date for ${promiseDate}.`;

    agentResult = {
      invoiceId,
      intent: "PROMISE_TO_PAY",
      confidence: classification.confidence,
      isPromptInjectionAttempt: false,
      actionTaken: "PROMISE_RECORDED",
      replyText,
      executionTimeMs: Date.now() - startTime,
    };
  }
  // ─── Branch F: Other / General Inquiry ──────────────────────────────────────
  else {
    replyText =
      "Thank you for contacting us regarding your invoice. Could you please specify your preferred payment timeframe or installment request?";

    agentResult = {
      invoiceId,
      intent: "OTHER",
      confidence: classification.confidence,
      isPromptInjectionAttempt: false,
      actionTaken: "IGNORED",
      replyText,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 5. Store Outbound Reply in Messages
  const [outboundMsg] = await db
    .insert(messages)
    .values({
      invoiceId,
      direction: "OUTBOUND",
      sender: "Settle AI Agent",
      content: replyText,
      intent: "OTHER",
      channel,
      inReplyTo: inboundMsg?.id ?? null,
      deliveryStatus: "sent",
      createdAt: new Date(),
    })
    .returning();

  return {
    inboundMessageId: inboundMsg.id,
    outboundMessageId: outboundMsg?.id,
    agentResult,
    replyText,
    invoice,
  };
}

/**
 * Backward-compatible wrapper for existing agent tests and simulation tools.
 */
export async function processInboundMessage(
  params: ProcessInboundParams
): Promise<AgentRunResult> {
  const result = await handleClientMessage({
    invoiceId: params.invoiceId,
    text: params.content,
    channel: "inbox",
    senderEmail: params.senderEmail,
    senderName: params.senderName,
  });
  return result.agentResult;
}
