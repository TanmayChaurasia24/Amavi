import { NextRequest, NextResponse } from "next/server";
import { listInvoices, getInvoice } from "../../../../src/lib/paypal/invoices";
import {
  upsertInvoiceFromPaypal,
  fetchAndUpsertInvoice,
} from "../../../../src/lib/invoice-upsert";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoiceId");

  try {
    if (invoiceId) {
      // Sync a specific invoice
      const row = await fetchAndUpsertInvoice(invoiceId);
      return NextResponse.json({ synced: 1, invoice: row });
    }

    // Sync all invoices (paged, up to 100)
    let synced = 0;
    const results = [];
    for (let page = 1; page <= 5; page++) {
      const items = await listInvoices({ page, pageSize: 20 });
      if (items.length === 0) break;
      for (const item of items) {
        const row = await upsertInvoiceFromPaypal(item);
        results.push({ paypalInvoiceId: item.id, status: row.status });
        synced++;
      }
      if (items.length < 20) break;
    }

    return NextResponse.json({ synced, invoices: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
