import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getSession } from "@/lib/session-server";
import { calculateInvoiceRisk } from "@/lib/risk";
import { desc, eq, or } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    const ownerId = session?.ownerId;
    const whereClause = ownerId
      ? or(eq(invoices.ownerId, ownerId), eq(invoices.ownerId, "owner-legacy"))
      : undefined;

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

    const enriched = list.map((inv) => {
      const risk = calculateInvoiceRisk({
        totalCents: inv.totalCents,
        amountPaidCents: inv.amountPaidCents,
        dueDate: inv.dueDate,
        status: inv.status,
        pastLateCount: inv.client?.pastLateCount ?? 0,
        avgDaysLate: inv.client?.avgDaysLate ?? 0,
      });

      return {
        ...inv,
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
