import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, planInstalments } from "@/db/schema";
import { getSession } from "@/lib/session-server";
import { calculateInvoiceRisk } from "@/lib/risk";
import { desc, eq, or, isNull, isNotNull } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    const ownerId = session?.ownerId;
    const whereClause = ownerId
      ? or(
          eq(invoices.ownerId, ownerId),
          eq(invoices.ownerId, "owner-legacy"),
          isNull(invoices.ownerId)
        )
      : undefined;

    // 1. Identify all PayPal invoice IDs that are installment sub-invoices
    const subInstalments = await db.query.planInstalments.findMany({
      where: isNotNull(planInstalments.paypalInvoiceId),
      columns: {
        paypalInvoiceId: true,
      },
    });

    const subInvoicePaypalIds = new Set(
      subInstalments
        .map((s) => s.paypalInvoiceId)
        .filter((id): id is string => Boolean(id))
    );

    // 2. Fetch all invoices matching the owner filter
    const list = await db.query.invoices.findMany({
      where: whereClause,
      with: {
        client: true,
        paymentPlans: {
          with: {
            instalments: true,
          },
        },
        approvalQueue: true,
      },
      orderBy: [desc(invoices.createdAt)],
    });

    // 3. Filter out sub-invoices so ONLY primary project/parent invoices appear on dashboard
    const parentInvoices = list.filter(
      (inv) => !subInvoicePaypalIds.has(inv.paypalInvoiceId)
    );

    // 4. Enrich parent invoices with accurate payment progress, status & risk
    const enriched = parentInvoices.map((inv) => {
      // Sum up any settled installment legs
      let paidFromInstalments = 0;
      if (inv.paymentPlans) {
        for (const plan of inv.paymentPlans) {
          for (const leg of plan.instalments) {
            if (leg.status === "PAID") {
              paidFromInstalments += leg.amountCents;
            }
          }
        }
      }

      const effectivePaidCents = Math.max(inv.amountPaidCents, paidFromInstalments);
      let effectiveStatus = inv.status;
      if (effectivePaidCents >= inv.totalCents && inv.totalCents > 0) {
        effectiveStatus = "PAID";
      } else if (effectivePaidCents > 0) {
        effectiveStatus = "PARTIALLY_PAID";
      } else if (inv.paymentPlans?.some((p) => p.status === "ACTIVE")) {
        effectiveStatus = "IN_NEGOTIATION";
      }

      const risk = calculateInvoiceRisk({
        totalCents: inv.totalCents,
        amountPaidCents: effectivePaidCents,
        dueDate: inv.dueDate,
        status: effectiveStatus,
        pastLateCount: inv.client?.pastLateCount ?? 0,
        avgDaysLate: inv.client?.avgDaysLate ?? 0,
      });

      return {
        ...inv,
        amountPaidCents: effectivePaidCents,
        status: effectiveStatus,
        risk,
      };
    });

    return NextResponse.json({ invoices: enriched });
  } catch (error) {
    console.error("[api/invoices] Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
