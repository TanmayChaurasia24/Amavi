import { NextRequest, NextResponse } from "next/server";
import { listInvoices } from "../../../../src/lib/paypal/invoices";
import {
  upsertInvoiceFromPaypal,
  fetchAndUpsertInvoice,
} from "../../../../src/lib/invoice-upsert";
import { reconcilePaymentWithPlans } from "../../../../src/lib/agent/reconcile";
import { getSession } from "@/lib/session-server";
import { db } from "@/db";
import { invoices, planInstalments } from "@/db/schema";
import { isNull, isNotNull, eq } from "drizzle-orm";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoiceId");

  try {
    const session = await getSession();
    const ownerId = session?.ownerId;

    if (invoiceId) {
      // Sync a specific invoice
      const row = await fetchAndUpsertInvoice(invoiceId, ownerId);
      return NextResponse.json({ synced: 1, count: 1, invoice: row });
    }

    // Sync all invoices (paged, up to 100)
    let synced = 0;
    const results = [];
    for (let page = 1; page <= 5; page++) {
      const items = await listInvoices({ page, pageSize: 20 });
      if (items.length === 0) break;
      for (const item of items) {
        const row = await upsertInvoiceFromPaypal(item, ownerId);
        results.push({ paypalInvoiceId: item.id, status: row.status });
        synced++;
      }
      if (items.length < 20) break;
    }

    // Ensure all plan instalments with paid invoices are reconciled with parents
    const linkedSubInstalments = await db.query.planInstalments.findMany({
      where: isNotNull(planInstalments.paypalInvoiceId),
      with: {
        plan: true,
      },
    });

    for (const inst of linkedSubInstalments) {
      if (!inst.paypalInvoiceId) continue;
      const subInv = await db.query.invoices.findFirst({
        where: eq(invoices.paypalInvoiceId, inst.paypalInvoiceId),
      });
      if (subInv && (subInv.status === "PAID" || subInv.amountPaidCents > 0)) {
        try {
          await reconcilePaymentWithPlans(inst.paypalInvoiceId, subInv.amountPaidCents);
        } catch (err) {
          console.warn("[sync] Plan reconciliation notice:", err);
        }
      }
    }

    return NextResponse.json({ synced, count: synced, invoices: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
