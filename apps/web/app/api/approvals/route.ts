import { NextResponse } from "next/server";
import { db } from "@/db";
import { approvalQueue } from "@/db/schema";
import { getSession } from "@/lib/session-server";
import { calculateInvoiceRisk } from "@/lib/risk";
import { desc, eq, or } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    const ownerId = session?.ownerId;
    const isDemo = Boolean(session?.isDemo || ownerId === "owner-demo" || ownerId === "owner-legacy");

    // Real users see ONLY their own approvals. Only demo/legacy accounts see seeded demo approvals.
    const whereClause = isDemo
      ? or(eq(approvalQueue.ownerId, ownerId ?? "owner-legacy"), eq(approvalQueue.ownerId, "owner-legacy"))
      : ownerId
      ? eq(approvalQueue.ownerId, ownerId)
      : undefined;

    const list = await db.query.approvalQueue.findMany({
      where: whereClause,
      with: {
        invoice: true,
        client: true,
      },
      orderBy: [desc(approvalQueue.createdAt)],
    });

    const enriched = list.map((item) => {
      let risk = null;
      if (item.invoice) {
        risk = calculateInvoiceRisk({
          totalCents: item.invoice.totalCents,
          amountPaidCents: item.invoice.amountPaidCents,
          dueDate: item.invoice.dueDate,
          status: item.invoice.status,
          pastLateCount: item.client?.pastLateCount ?? 0,
          avgDaysLate: item.client?.avgDaysLate ?? 0,
        });
      }

      return {
        ...item,
        risk,
      };
    });

    return NextResponse.json({ approvals: enriched });
  } catch (error) {
    console.error("[api/approvals] Error fetching approvals:", error);
    return NextResponse.json(
      { error: "Failed to fetch approvals" },
      { status: 500 }
    );
  }
}
