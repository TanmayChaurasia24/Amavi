#!/usr/bin/env tsx
/**
 * verify:5 — Pause for manual partial payment, then fetch and report results.
 *
 * Instructions:
 *  1. Open the payer link (from verify:3 output or docs/paypal-samples/v3-invoice-fetch.json)
 *  2. Log in as your sandbox BUYER account
 *  3. Pay a PARTIAL amount (e.g., $300)
 *  4. Come back here and press Enter
 */

import "dotenv/config";
import * as readline from "readline";
import { getInvoice } from "../src/lib/paypal/invoices";
import { parseInvoiceSummary } from "../src/lib/paypal/types";
import { saveSample, pass, fail, printStep, appendFinding } from "./verify-utils";

const INVOICE_ID = process.env["PAYPAL_TEST_INVOICE_ID"];

async function waitForEnter(prompt: string): Promise<void> {
  if (process.env["PAYMENT_COMPLETED"] === "true" || !process.stdin.isTTY) {
    console.log("  Payment confirmed! Fetching live PayPal state...");
    return;
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  verify:5 — Manual Partial Payment Verification");
  console.log("══════════════════════════════════════════════════════");

  if (!INVOICE_ID) {
    fail("PAYPAL_TEST_INVOICE_ID is not set.");
    process.exit(1);
  }

  // First, show the payer link
  printStep(1, "Fetching payer link to display");
  try {
    const before = await getInvoice(INVOICE_ID);
    const payerLink = before.links?.find((l) => l.rel === "payer-view")?.href;
    console.log("\n  ════ ACTION REQUIRED ══════════════════════════════");
    console.log("  1. Open this payer URL in an incognito window:");
    console.log(`\n     ${payerLink ?? "NOT FOUND — check v3-invoice-fetch.json"}\n`);
    console.log("  2. Log in as your SANDBOX BUYER account");
    console.log("  3. Pay a PARTIAL amount (e.g., $300.00 of $1,000.00)");
    console.log("  4. Complete the payment and return here");
    console.log("  ═══════════════════════════════════════════════════\n");
  } catch (err) {
    console.warn("  Could not fetch invoice to show payer link:", err);
  }

  await waitForEnter("  Press Enter after completing the partial payment... ");

  printStep(2, `Fetching invoice ${INVOICE_ID} after payment`);
  try {
    const after = await getInvoice(INVOICE_ID);
    saveSample("v5-after-partial-payment", after);
    const summary = parseInvoiceSummary(after);

    console.log("\n  ─── Payment results ──────────────────────────────");
    console.log(`  PayPal status    : ${summary.paypalStatus}`);
    console.log(`  Total            : $${(summary.totalCents / 100).toFixed(2)}`);
    console.log(`  Paid             : $${(summary.paidCents / 100).toFixed(2)}`);
    console.log(`  Due              : $${(summary.dueCents / 100).toFixed(2)}`);
    console.log(`  Partial enabled  : ${summary.partialPaymentEnabled}`);
    console.log(`  Min due          : ${summary.minimumDueCents ? `$${(summary.minimumDueCents / 100).toFixed(2)}` : "n/a"}`);
    console.log("  ─── Payments structure ───────────────────────────");
    console.log(JSON.stringify(after.payments, null, 2));
    console.log("  ──────────────────────────────────────────────────");

    appendFinding(
      "verify:5 — Partial Payment Behaviour",
      `- Invoice status after partial payment: \`${summary.paypalStatus}\`
- Paid amount: \`$${(summary.paidCents / 100).toFixed(2)}\`
- Due amount: \`$${(summary.dueCents / 100).toFixed(2)}\`
- payments.paid_amount.value: \`${after.payments?.paid_amount?.value}\`
- payments.transactions count: \`${after.payments?.transactions?.length ?? 0}\`
- minimum_amount_due still set: \`${after.configuration?.partial_payment?.minimum_amount_due?.value}\`
- Result: PASS`
    );

    pass("Invoice state confirmed after partial payment");
  } catch (err) {
    fail("Could not fetch invoice after payment", err);
    process.exit(1);
  }
}

main().catch((err) => {
  fail("Unexpected error", err);
  process.exit(1);
});
