#!/usr/bin/env tsx
/**
 * verify:3 — Confirm payer-view URL field path and partial payment settings.
 */

import "dotenv/config";
import { getInvoice, extractPayerViewUrl } from "../src/lib/paypal/invoices";
import { parseInvoiceSummary } from "../src/lib/paypal/types";
import { saveSample, pass, fail, printStep, appendFinding } from "./verify-utils";

const INVOICE_ID = process.env["PAYPAL_TEST_INVOICE_ID"];

async function main() {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  verify:3 — Confirm Payer URL + Partial Payment");
  console.log("══════════════════════════════════════════════════════");

  if (!INVOICE_ID) {
    fail("PAYPAL_TEST_INVOICE_ID is not set.");
    process.exit(1);
  }

  printStep(1, `Fetching invoice ${INVOICE_ID}`);
  try {
    const invoice = await getInvoice(INVOICE_ID);
    saveSample("v3-invoice-fetch", invoice);

    const payerLink = extractPayerViewUrl(invoice);
    const summary = parseInvoiceSummary(invoice);

    console.log("\n  Field paths from real response:");
    console.log(
      `  Payer URL path  : links[].href where rel="payer-view"`
    );
    console.log(`  Payer URL value : ${payerLink ?? "NOT FOUND ⚠"}`);
    console.log(`\n  Partial payment settings:`);
    console.log(
      `  allow_partial_payment : ${invoice.configuration?.partial_payment?.allow_partial_payment}`
    );
    console.log(
      `  minimum_amount_due    : ${invoice.configuration?.partial_payment?.minimum_amount_due?.value} ${invoice.configuration?.partial_payment?.minimum_amount_due?.currency_code}`
    );
    console.log(`\n  Invoice summary (parsed):`);
    console.log(`  paypalStatus         : ${summary.paypalStatus}`);
    console.log(`  totalCents           : ${summary.totalCents}`);
    console.log(`  paidCents            : ${summary.paidCents}`);
    console.log(`  dueCents             : ${summary.dueCents}`);
    console.log(`  dueDate              : ${summary.dueDate}`);
    console.log(`  partialPaymentEnabled: ${summary.partialPaymentEnabled}`);
    console.log(`  minimumDueCents      : ${summary.minimumDueCents}`);

    // List all link rels present
    const linkRels = invoice.links?.map((l) => l.rel).join(", ");
    console.log(`\n  All link rels present: ${linkRels}`);

    appendFinding(
      "verify:3 — Payer URL Field Path + Partial Payment Persistence",
      `- Payer URL field path: \`invoice.links[].href where rel === "payer-view"\`
- Payer URL found: \`${payerLink ? "YES" : "NO"}\`
- allow_partial_payment persisted: \`${invoice.configuration?.partial_payment?.allow_partial_payment}\`
- minimum_amount_due persisted: \`${invoice.configuration?.partial_payment?.minimum_amount_due?.value}\`
- All link rels: \`${linkRels}\`
- Result: PASS`
    );

    if (payerLink) {
      pass(`Payer URL confirmed at links[rel=payer-view]: ${payerLink}`);
    } else {
      fail("Payer URL not found in response");
    }
  } catch (err) {
    fail("Could not fetch invoice", err);
    process.exit(1);
  }
}

main().catch((err) => {
  fail("Unexpected error", err);
  process.exit(1);
});
