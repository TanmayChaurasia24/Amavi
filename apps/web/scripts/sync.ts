#!/usr/bin/env tsx
/**
 * CLI sync script — pull invoices from PayPal and upsert to DB.
 * Usage:
 *   pnpm run sync                    # sync all
 *   pnpm run sync -- --invoiceId=INV-XYZ  # sync one
 */

import "dotenv/config";
import { listInvoices, getInvoice } from "../src/lib/paypal/invoices";
import {
  upsertInvoiceFromPaypal,
  fetchAndUpsertInvoice,
} from "../src/lib/invoice-upsert";

const args = process.argv.slice(2);
const invoiceIdArg = args
  .find((a) => a.startsWith("--invoiceId="))
  ?.split("=")[1];

async function main() {
  console.log("\n🔄 Settle — Sync from PayPal\n");

  if (invoiceIdArg) {
    console.log(`Syncing single invoice: ${invoiceIdArg}`);
    const row = await fetchAndUpsertInvoice(invoiceIdArg);
    console.log(
      `✅ Synced: ${row.paypalInvoiceId} → status=${row.status} paid=${row.amountPaidCents}c`
    );
    return;
  }

  console.log("Syncing all invoices from PayPal...");
  let synced = 0;
  for (let page = 1; page <= 10; page++) {
    const items = await listInvoices({ page, pageSize: 20 });
    if (items.length === 0) break;
    for (const item of items) {
      const row = await upsertInvoiceFromPaypal(item);
      console.log(
        `  ${row.paypalInvoiceId} → ${row.status} (paid=${row.amountPaidCents}c)`
      );
      synced++;
    }
    if (items.length < 20) break;
  }
  console.log(`\n✅ Synced ${synced} invoice(s)`);
}

main().catch((err) => {
  console.error("❌ Sync failed:", err);
  process.exit(1);
});
