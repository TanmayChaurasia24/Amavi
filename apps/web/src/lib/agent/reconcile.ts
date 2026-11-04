import { db } from "@/db";
import {
  invoices,
  paymentPlans,
  planInstalments,
  agentLogs,
} from "@/db/schema";
import { calculateInvoiceRisk } from "@/lib/risk";
import { eq } from "drizzle-orm";

export interface ReconcileResult {
  reconciled: boolean;
  isInstalment: boolean;
  planId?: string;
  instalmentId?: string;
  instalmentNumber?: number;
  parentInvoiceId?: string;
  totalPaidCents: number;
  parentStatus: string;
  planStatus: string;
}

/**
 * Reconciles incoming PayPal invoice payments against multi-installment plans.
 * If the paid PayPal invoice is an installment leg or deposit:
 * 1. Marks the installment as PAID with timestamp.
 * 2. Recalculates total paid balance on the parent invoice.
 * 3. Transitions status to PARTIALLY_PAID or PAID (if fully settled).
 * 4. Advances plan status to COMPLETED if all legs are fulfilled.
 * 5. Appends transparent audit record in agent_logs.
 */
export async function reconcilePaymentWithPlans(
  paypalInvoiceId: string,
  paidAmountCents?: number
): Promise<ReconcileResult> {
  // 1. Check if this PayPal invoice is linked directly to an installment
  const instalment = await db.query.planInstalments.findFirst({
    where: eq(planInstalments.paypalInvoiceId, paypalInvoiceId),
    with: {
      plan: {
        with: {
          invoice: {
            with: { client: true },
          },
          instalments: true,
        },
      },
    },
  });

  if (instalment && instalment.plan && instalment.plan.invoice) {
    const plan = instalment.plan;
    const parentInvoice = plan.invoice;

    const shouldMarkPaid = paidAmountCents === undefined || paidAmountCents > 0;

    if (shouldMarkPaid) {
      // Mark this leg as PAID
      await db
        .update(planInstalments)
        .set({
          status: "PAID",
          paidAt: new Date(),
        })
        .where(eq(planInstalments.id, instalment.id));
    }

    // Calculate sum of all paid legs in this plan
    let totalPaidFromLegs = 0;
    let allPaid = true;

    for (const leg of plan.instalments) {
      if (leg.id === instalment.id) {
        if (shouldMarkPaid) {
          totalPaidFromLegs += (paidAmountCents ?? leg.amountCents);
        } else {
          allPaid = false;
        }
      } else if (leg.status === "PAID") {
        totalPaidFromLegs += leg.amountCents;
      } else {
        allPaid = false;
      }
    }

    const isFullySettled = totalPaidFromLegs >= parentInvoice.totalCents || allPaid;
    const newParentStatus = isFullySettled ? "PAID" : "PARTIALLY_PAID";
    const newPlanStatus = isFullySettled ? "COMPLETED" : "ACTIVE";

    // Recalculate risk score for parent invoice
    const newRisk = calculateInvoiceRisk({
      totalCents: parentInvoice.totalCents,
      amountPaidCents: totalPaidFromLegs,
      dueDate: parentInvoice.dueDate,
      status: newParentStatus,
      pastLateCount: parentInvoice.client?.pastLateCount ?? 0,
      avgDaysLate: parentInvoice.client?.avgDaysLate ?? 0,
    });

    // Update parent invoice
    await db
      .update(invoices)
      .set({
        amountPaidCents: totalPaidFromLegs,
        status: newParentStatus,
        riskScore: newRisk.score,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, parentInvoice.id));

    // Update plan status
    await db
      .update(paymentPlans)
      .set({
        status: newPlanStatus,
        updatedAt: new Date(),
      })
      .where(eq(paymentPlans.id, plan.id));

    // Log to AgentLogs
    await db.insert(agentLogs).values({
      invoiceId: parentInvoice.id,
      eventType: "WEBHOOK_INSTALMENT_RECONCILED",
      reasoning: `PayPal webhook verified payment of $${(
        (paidAmountCents ?? instalment.amountCents) / 100
      ).toFixed(2)} on installment #${
        instalment.instalmentNumber
      }. Cumulative paid: $${(totalPaidFromLegs / 100).toFixed(
        2
      )} / $${(parentInvoice.totalCents / 100).toFixed(2)}. Status: ${newParentStatus}.`,
      inputPayload: {
        paypalInvoiceId,
        paidLegNumber: instalment.instalmentNumber,
        paidAmountCents: paidAmountCents ?? instalment.amountCents,
      },
      outputPayload: {
        parentInvoiceId: parentInvoice.id,
        parentStatus: newParentStatus,
        planStatus: newPlanStatus,
        totalPaidCents: totalPaidFromLegs,
        isFullySettled,
      },
      executionTimeMs: 50,
      createdAt: new Date(),
    });

    return {
      reconciled: true,
      isInstalment: true,
      planId: plan.id,
      instalmentId: instalment.id,
      instalmentNumber: instalment.instalmentNumber,
      parentInvoiceId: parentInvoice.id,
      totalPaidCents: totalPaidFromLegs,
      parentStatus: newParentStatus,
      planStatus: newPlanStatus,
    };
  }

  // 2. Alternatively, check if this is the parent invoice with an active plan
  const directInvoice = await db.query.invoices.findFirst({
    where: eq(invoices.paypalInvoiceId, paypalInvoiceId),
    with: {
      paymentPlans: {
        with: { instalments: true },
      },
      client: true,
    },
  });

  if (directInvoice && directInvoice.paymentPlans.length > 0) {
    const activePlan = directInvoice.paymentPlans.find((p) => p.status === "ACTIVE");
    if (activePlan) {
      // If parent invoice received payment, advance the earliest pending installment
      const pendingLeg = activePlan.instalments
        .filter((l) => l.status === "PENDING")
        .sort((a, b) => a.instalmentNumber - b.instalmentNumber)[0];

      if (pendingLeg) {
        await db
          .update(planInstalments)
          .set({ status: "PAID", paidAt: new Date() })
          .where(eq(planInstalments.id, pendingLeg.id));
      }

      const totalPaid = Math.min(
        directInvoice.totalCents,
        directInvoice.amountPaidCents + (paidAmountCents ?? pendingLeg?.amountCents ?? 0)
      );

      const isFullySettled = totalPaid >= directInvoice.totalCents;
      const newStatus = isFullySettled ? "PAID" : "PARTIALLY_PAID";

      await db
        .update(invoices)
        .set({
          amountPaidCents: totalPaid,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, directInvoice.id));

      if (isFullySettled) {
        await db
          .update(paymentPlans)
          .set({ status: "COMPLETED", updatedAt: new Date() })
          .where(eq(paymentPlans.id, activePlan.id));
      }

      await db.insert(agentLogs).values({
        invoiceId: directInvoice.id,
        eventType: "WEBHOOK_INSTALMENT_RECONCILED",
        reasoning: `Reconciled direct invoice payment against active payment plan. Leg #${
          pendingLeg?.instalmentNumber ?? 1
        } marked as fulfilled. Total paid: $${(totalPaid / 100).toFixed(2)}.`,
        inputPayload: { paypalInvoiceId, paidAmountCents },
        outputPayload: {
          parentStatus: newStatus,
          totalPaidCents: totalPaid,
        },
        executionTimeMs: 40,
        createdAt: new Date(),
      });

      return {
        reconciled: true,
        isInstalment: false,
        parentInvoiceId: directInvoice.id,
        totalPaidCents: totalPaid,
        parentStatus: newStatus,
        planStatus: isFullySettled ? "COMPLETED" : "ACTIVE",
      };
    }
  }

  return {
    reconciled: false,
    isInstalment: false,
    totalPaidCents: 0,
    parentStatus: "UNKNOWN",
    planStatus: "NONE",
  };
}
