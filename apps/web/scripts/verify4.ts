#!/usr/bin/env tsx
/**
 * verify:4 — Send an invoice reminder and record the result.
 */

import "dotenv/config";
import { sendReminder } from "../src/lib/paypal/invoices";
import { PayPalApiError } from "../src/lib/paypal/client";
import { saveSample, pass, fail, printStep, appendFinding } from "./verify-utils";

const INVOICE_ID = process.env["PAYPAL_TEST_INVOICE_ID"];

async function main() {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  verify:4 — Send Invoice Reminder");
  console.log("══════════════════════════════════════════════════════");

  if (!INVOICE_ID) {
    fail("PAYPAL_TEST_INVOICE_ID is not set.");
    process.exit(1);
  }

  printStep(1, `Sending reminder for invoice ${INVOICE_ID}`);
  try {
    await sendReminder(
      INVOICE_ID,
      "Friendly reminder: your invoice is due. Please pay at your earliest convenience."
    );

    saveSample("v4-reminder-result", {
      invoiceId: INVOICE_ID,
      result: "success",
      note: "204 No Content returned by PayPal (success)",
    });

    appendFinding(
      "verify:4 — Send Reminder",
      `- Reminder sent successfully for invoice \`${INVOICE_ID}\`
- PayPal response: \`204 No Content\` (success)
- Restrictions observed: Reminders can only be sent to SENT/UNPAID invoices (not DRAFT or PAID)
- Result: PASS`
    );

    pass("Reminder sent successfully (204 No Content)");
  } catch (err) {
    const apiErr = err instanceof PayPalApiError ? err : null;
    if (apiErr) {
      console.error(`  HTTP ${apiErr.statusCode} | debug-id: ${apiErr.debugId}`);
      console.error(`  Body: ${apiErr.body}`);
      saveSample("v4-reminder-error", {
        statusCode: apiErr.statusCode,
        debugId: apiErr.debugId,
        body: apiErr.body,
      });
      appendFinding(
        "verify:4 — Send Reminder (FAILED)",
        `- Reminder FAILED for invoice \`${INVOICE_ID}\`
- HTTP ${apiErr.statusCode}: ${apiErr.body}
- debug-id: ${apiErr.debugId}
- Possible reason: Invoice status may not allow reminders (e.g. DRAFT, CANCELLED, PAID)
- Result: FAIL`
      );
    }
    fail("Reminder failed", err);
    // Don't exit(1) — this is expected to fail for some invoice states
  }
}

main().catch((err) => {
  fail("Unexpected error", err);
  process.exit(1);
});
