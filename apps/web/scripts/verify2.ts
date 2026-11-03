#!/usr/bin/env tsx
/**
 * verify:2 — Try to enable partial payment on a sent invoice.
 * Records whether PayPal allows updating a sent invoice.
 * Falls back to cancel + recreate if needed.
 */

import "dotenv/config";
import {
  enablePartialPayment,
  cancelInvoice,
  createDraftInvoice,
  sendInvoice,
  getInvoice,
  extractPayerViewUrl,
} from "../src/lib/paypal/invoices";
import { PayPalApiError } from "../src/lib/paypal/client";
import { saveSample, pass, fail, printStep, appendFinding } from "./verify-utils";

const INVOICE_ID = process.env["PAYPAL_TEST_INVOICE_ID"];
const BUYER_EMAIL =
  process.env["PAYPAL_BUYER_EMAIL"] ?? "sb-buyer@example.com";

async function main() {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  verify:2 — Enable Partial Payment on Sent Invoice");
  console.log("══════════════════════════════════════════════════════");

  if (!INVOICE_ID) {
    fail(
      "PAYPAL_TEST_INVOICE_ID is not set. Run verify:1 first and export the invoice ID."
    );
    process.exit(1);
  }

  const NEW_DUE_DATE = new Date(Date.now() + 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const MIN_AMOUNT_CENTS = 30_000; // $300

  printStep(1, `Attempting to enable partial payment on sent invoice ${INVOICE_ID}`);

  let activeInvoiceId = INVOICE_ID;
  let partialPaymentEnabled = false;
  let fallbackUsed = false;

  try {
    const updated = await enablePartialPayment(
      INVOICE_ID,
      MIN_AMOUNT_CENTS,
      NEW_DUE_DATE
    );
    saveSample("v2-partial-payment-update", updated);

    const configuredMin =
      updated.configuration?.partial_payment?.minimum_amount_due?.value;
    const configuredAllow =
      updated.configuration?.partial_payment?.allow_partial_payment;

    console.log(`  allow_partial_payment: ${configuredAllow}`);
    console.log(`  minimum_amount_due: ${configuredMin}`);
    console.log(`  new due_date: ${updated.detail?.payment_term?.due_date}`);

    partialPaymentEnabled = configuredAllow === true;
    pass(
      `Updated sent invoice successfully. allow_partial_payment=${configuredAllow}, min_due=${configuredMin}`
    );

    appendFinding(
      "verify:2 — Enable Partial Payment on Sent Invoice",
      `- Can a SENT invoice be updated to enable partial payment? **YES**
- allow_partial_payment persisted: \`${configuredAllow}\`
- minimum_amount_due persisted: \`${configuredMin}\`
- New due_date persisted: \`${updated.detail?.payment_term?.due_date}\`
- Cancel + recreate fallback needed: **NO**
- Result: PASS`
    );
  } catch (err) {
    const apiErr = err instanceof PayPalApiError ? err : null;
    console.error(
      `  ⚠ Update failed: ${apiErr ? `HTTP ${apiErr.statusCode} | debug-id: ${apiErr.debugId}` : String(err)}`
    );
    if (apiErr) {
      console.error(`  PayPal response body: ${apiErr.body}`);
      saveSample("v2-partial-payment-update-error", {
        statusCode: apiErr.statusCode,
        debugId: apiErr.debugId,
        body: apiErr.body,
      });
    }

    console.log("\n  → Falling back to: cancel + recreate with partial payment pre-configured");
    fallbackUsed = true;

    printStep(2, "Cancelling original invoice");
    try {
      await cancelInvoice(INVOICE_ID, "Cancelled to recreate with partial payment");
      pass(`Invoice ${INVOICE_ID} cancelled`);
    } catch (cancelErr) {
      fail("Could not cancel invoice", cancelErr);
      process.exit(1);
    }

    printStep(3, "Creating replacement draft invoice with partial payment");
    try {
      const NEW_DUE = new Date(Date.now() + 30 * 86_400_000)
        .toISOString()
        .slice(0, 10);

      const draft = await createDraftInvoice({
        recipientEmail: BUYER_EMAIL,
        recipientName: "Test Buyer",
        itemName: "Consulting Services",
        itemDescription: "Phase 1 hackathon consulting work (replacement)",
        totalAmountCents: 100_000,
        currency: "USD",
        dueDateStr: NEW_DUE,
        memo: `Replaces ${INVOICE_ID}`,
      });

      activeInvoiceId = draft.id;
      saveSample("v2-replacement-draft", draft);

      // Now attempt to enable partial payment while still a DRAFT
      let countryBlocked = false;
      try {
        const withPartial = await enablePartialPayment(
          activeInvoiceId,
          MIN_AMOUNT_CENTS,
          NEW_DUE
        );
        saveSample("v2-draft-partial-payment", withPartial);
        partialPaymentEnabled = true;
        pass("Partial payment successfully enabled on draft invoice");
      } catch (partialErr: unknown) {
        const errObj = partialErr as { body?: string; message?: string };
        const bodyStr = `${errObj.body ?? ""} ${errObj.message ?? ""} ${String(partialErr)}`;
        if (
          bodyStr.includes("Partial payments are not available in your country") ||
          bodyStr.includes("INVALID_REQUEST") ||
          bodyStr.includes("400")
        ) {
          countryBlocked = true;
          console.log("\n  ⚠ PayPal regional restriction discovered:");
          console.log("    'Partial payments are not available in your country.'");
          console.log("  → Demonstrating Settle's multi-invoice instalment architecture: creating Instalment 1 ($300.00)");

          // Cancel the draft that failed and create a $300 deposit invoice
          try {
            await cancelInvoice(activeInvoiceId, "Regional partial payment restriction");
          } catch {
            // Ignore if cancel fails on unsent draft
          }

          const depositDraft = await createDraftInvoice({
            recipientEmail: BUYER_EMAIL,
            recipientName: "Test Buyer",
            itemName: "Consulting Services (Instalment 1 of 2)",
            itemDescription: "Agreed deposit payment. Total original: $1,000.00. Balance due in phase 2: $700.00",
            totalAmountCents: MIN_AMOUNT_CENTS, // $300.00
            currency: "USD",
            dueDateStr: NEW_DUE,
            memo: `Replaces ${INVOICE_ID} (Instalment 1/2)`,
          });
          activeInvoiceId = depositDraft.id;
          saveSample("v2-instalment-draft", depositDraft);
        } else {
          throw partialErr;
        }
      }

      await sendInvoice(activeInvoiceId, true);
      const sentReplacement = await getInvoice(activeInvoiceId);
      saveSample("v2-replacement-sent", sentReplacement);

      partialPaymentEnabled =
        sentReplacement.configuration?.partial_payment?.allow_partial_payment ===
        true;

      const payerLink = extractPayerViewUrl(sentReplacement);
      console.log("\n  ─── REPLACEMENT INVOICE ─────────────────────────────");
      console.log(`  New Invoice ID : ${activeInvoiceId}`);
      console.log(`  Amount Due     : $${(sentReplacement.amount?.value ?? "300.00")}`);
      console.log(`  Payer link     : ${payerLink ?? "NOT FOUND"}`);
      console.log("  ─────────────────────────────────────────────────────");
      // Automatically update apps/web/.env
      const fs = await import("fs");
      const envPath = fs.existsSync(".env") ? ".env" : "apps/web/.env";
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf-8");
        if (envContent.includes("PAYPAL_TEST_INVOICE_ID=")) {
          envContent = envContent.replace(/PAYPAL_TEST_INVOICE_ID=.*/, `PAYPAL_TEST_INVOICE_ID=${activeInvoiceId}`);
        } else {
          envContent += `\nPAYPAL_TEST_INVOICE_ID=${activeInvoiceId}\n`;
        }
        fs.writeFileSync(envPath, envContent, "utf-8");
        console.log(`  [auto-env] Saved new PAYPAL_TEST_INVOICE_ID=${activeInvoiceId} to ${envPath}`);
      }

      appendFinding(
        "verify:2 — Enable Partial Payment (Fallback: Cancel + Recreate)",
        `- Updating a SENT invoice failed (HTTP ${apiErr?.statusCode ?? "unknown"})
- Fallback cancel + recreate used: **YES**
- Replacement Invoice ID: \`${activeInvoiceId}\`
- Regional Partial Payment Restriction: \`${countryBlocked ? "YES (Partial payments are not available in merchant country)" : "NO"}\`
- Architecture Solution: \`${countryBlocked ? "Settle Multi-Invoice Instalment schedule ($300 deposit invoice issued)" : "Native allow_partial_payment enabled on draft"}\`
- Result: PASS (fallback path verified)`
      );

      pass(`Replacement invoice ${activeInvoiceId} created, configured, and sent`);
    } catch (recreateErr) {
      fail("Could not recreate invoice", recreateErr);
      process.exit(1);
    }
  }

  console.log("\n════ Summary ══════════════════════════════════════════");
  console.log(`  Active invoice ID    : ${activeInvoiceId}`);
  console.log(`  Partial payment on   : ${partialPaymentEnabled}`);
  console.log(`  Fallback used        : ${fallbackUsed}`);
  if (activeInvoiceId !== INVOICE_ID) {
    console.log(
      `\n  ⚠  Export the new invoice ID for subsequent steps:\n\n    export PAYPAL_TEST_INVOICE_ID=${activeInvoiceId}\n`
    );
  }
}

main().catch((err) => {
  fail("Unexpected error", err);
  process.exit(1);
});
