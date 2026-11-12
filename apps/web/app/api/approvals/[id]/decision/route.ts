import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { approvalQueue, agentLogs, invoices } from "@/db/schema";
import { createPaymentPlan } from "@/lib/agent/tools";
import { eq } from "drizzle-orm";

const DecisionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "APPROVED", "REJECTED"]),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = DecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid decision payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const item = await db.query.approvalQueue.findFirst({
      where: eq(approvalQueue.id, id),
    });

    if (!item) {
      return NextResponse.json(
        { error: "Approval ticket not found" },
        { status: 404 }
      );
    }

    const normalizedStatus: "APPROVED" | "REJECTED" =
      parsed.data.action.startsWith("APPROV") ? "APPROVED" : "REJECTED";

    // 1. Update ticket in approval_queue
    const [updated] = await db
      .update(approvalQueue)
      .set({
        status: normalizedStatus,
        decidedAt: new Date(),
      })
      .where(eq(approvalQueue.id, id))
      .returning();

    // 2. Insert into agent_logs for full auditability
    const eventType =
      normalizedStatus === "APPROVED" ? "OWNER_APPROVED" : "OWNER_REJECTED";

    await db.insert(agentLogs).values({
      invoiceId: item.invoiceId,
      eventType,
      reasoning: `Owner manually ${normalizedStatus.toLowerCase()} the proposal: "${item.proposalSummary}". ${
        parsed.data.notes ? `Note: "${parsed.data.notes}"` : ""
      }`,
      inputPayload: {
        approvalId: id,
        decision: normalizedStatus,
        notes: parsed.data.notes ?? null,
      },
      outputPayload: {
        ticketStatus: normalizedStatus,
        actionPayload: item.actionPayload,
      },
      executionTimeMs: 45,
      createdAt: new Date(),
    });

    // 3. Approval Execution: Materialize Payment Plan if approved and proposal params exist
    let executedPlan = null;
    if (normalizedStatus === "APPROVED" && item.invoiceId) {
      const payload = item.actionPayload as Record<string, unknown> | null;

      // Priority order for deposit amount:
      //   1. clientRequestedDepositCents — what the client actually asked for (new field)
      //   2. requestedDepositCents — legacy field (may be guardrail-computed, kept for back-compat)
      //   3. depositCents — older fallback field
      // Human approval overrides ALL guardrails, so we always honour the client's request.
      const depositCents =
        (payload?.clientRequestedDepositCents as number | undefined) ??
        (payload?.requestedDepositCents as number | undefined) ??
        (payload?.depositCents as number | undefined);

      if (depositCents && depositCents > 0) {
        const instalmentCount = (payload?.instalmentCount as number) ?? 2;
        const durationDays = (payload?.durationDays as number) ?? 60;
        const frequency =
          ((payload?.frequency as string) ?? "MONTHLY") as "WEEKLY" | "BIWEEKLY" | "MONTHLY";

        try {
          // isOwnerOverride: true skips all guardrail re-checks inside createPaymentPlan
          executedPlan = await createPaymentPlan(item.invoiceId, {
            depositCents,
            instalmentCount,
            durationDays,
            frequency,
            isOwnerOverride: true,
          });
        } catch (planErr) {
          console.error(
            "[api/approvals/decision] Failed to execute payment plan on approval:",
            planErr
          );
        }
      }

      // Ensure invoice is updated to IN_NEGOTIATION
      await db
        .update(invoices)
        .set({ status: "IN_NEGOTIATION", updatedAt: new Date() })
        .where(eq(invoices.id, item.invoiceId));
    }

    return NextResponse.json({
      success: true,
      approval: updated,
      executedPlan,
    });
  } catch (error) {
    console.error("[api/approvals/decision] Error recording decision:", error);
    return NextResponse.json(
      { error: "Failed to record approval decision" },
      { status: 500 }
    );
  }
}
