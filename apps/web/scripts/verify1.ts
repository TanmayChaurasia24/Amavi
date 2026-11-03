#!/usr/bin/env tsx
/**
 * verify:1 — Create a draft invoice and send it.
 * Prints the invoice ID and payer link.
 * Saves raw response to docs/paypal-samples/
 */

import "dotenv/config";
import { createDraftInvoice, sendInvoice, getInvoice, extractPayerViewUrl } from "../src/lib/paypal/invoices";
import { saveSample, pass, fail, printStep, appendFinding } from "./verify-utils";

// ── Config ────────────────────────────────────────────────────────────────────
const BUYER_EMAIL =
  process.env["PAYPAL_BUYER_EMAIL"] ?? "sb-buyer@example.com";

async function main() {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  verify:1 — Create + Send Invoice");
  console.log("══════════════════════════════════════════════════════");

  printStep(1, "Creating draft invoice");

  // Due date in the past (yesterday) to trigger OVERDUE scenario for later tests
  const yesterday = new Date(Date.now() - 86_400_000)
    .toISOString()
    .slice(0, 10);

  let invoiceId: string;
  try {
    const draft = await createDraftInvoice({
      recipientEmail: BUYER_EMAIL,
      recipientName: "Test Buyer",
      itemName: "Consulting Services",
      itemDescription: "Phase 1 hackathon consulting work",
      totalAmountCents: 100_000, // $1,000.00
      currency: "USD",
      dueDateStr: yesterday,
      note: "Due on receipt. Created by Settle verification script.",
    });

    invoiceId = draft.id;
    saveSample("v1-draft-invoice", draft);
    console.log(`  Invoice created: ${invoiceId}`);
    console.log(`  Status: ${draft.status}`);
    pass(`Draft invoice created: ${invoiceId}`);
  } catch (err) {
    fail("Could not create draft invoice", err);
    process.exit(1);
  }

  printStep(2, "Sending invoice to recipient");
  try {
    await sendInvoice(invoiceId, true);
    pass(`Invoice ${invoiceId} sent`);
  } catch (err) {
    fail("Could not send invoice", err);
    process.exit(1);
  }

  printStep(3, "Fetching sent invoice to confirm state and payer link");
  try {
    const sent = await getInvoice(invoiceId);
    saveSample("v1-sent-invoice", sent);

    const payerLink = extractPayerViewUrl(sent);
    console.log("\n  ─── IMPORTANT ───────────────────────────────────────");
    console.log(`  Invoice ID : ${invoiceId}`);
    console.log(`  Status     : ${sent.status}`);
    console.log(`  Payer link : ${payerLink ?? "NOT FOUND"}`);
    console.log("  ────────────────────────────────────────────────────");

    // Automatically update apps/web/.env
    const fs = await import("fs");
    const envPath = fs.existsSync(".env") ? ".env" : "apps/web/.env";
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf-8");
      if (envContent.includes("PAYPAL_TEST_INVOICE_ID=")) {
        envContent = envContent.replace(/PAYPAL_TEST_INVOICE_ID=.*/, `PAYPAL_TEST_INVOICE_ID=${invoiceId}`);
      } else {
        envContent += `\nPAYPAL_TEST_INVOICE_ID=${invoiceId}\n`;
      }
      fs.writeFileSync(envPath, envContent, "utf-8");
      console.log(`  [auto-env] Saved PAYPAL_TEST_INVOICE_ID=${invoiceId} to ${envPath}`);
    }

    appendFinding(
      "verify:1 — Create + Send Invoice",
      `- Invoice ID: \`${invoiceId}\`
- Status after send: \`${sent.status}\`
- Payer link field path: \`links[].href where rel === "payer-view"\`
- Payer link: \`${payerLink ?? "NOT FOUND"}\`
- Result: PASS`
    );

    pass("Invoice fetched successfully after send");
  } catch (err) {
    fail("Could not fetch sent invoice", err);
    process.exit(1);
  }
}

main().catch((err) => {
  fail("Unexpected error", err);
  process.exit(1);
});
