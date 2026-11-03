# Phase 1 Findings — Settle × PayPal Sandbox Verification

> **Date:** October 2026  
> **Environment:** PayPal Sandbox (`https://api-m.sandbox.paypal.com`)  
> **Verification Suite:** `apps/web/scripts/verify1.ts` through `verify6.ts`  

---

## Executive Summary Table

| Question | Answer from Real Sandbox | Evidence |
|---|---|---|
| **Can a SENT invoice be updated to enable partial payment?** | **NO.** Calling `PUT /v2/invoicing/invoices/{id}` with `allow_partial_payment: true` returns `400 Bad Request`. Furthermore, in many merchant regions (such as India), PayPal blocks partial payments entirely with `"Partial payments are not available in your country"`. | `docs/paypal-samples/v2-partial-payment-update-error.json` |
| **Which fields persist after update?** | Standard metadata (memo, note, line item descriptions, payment term due dates). Partial payment configuration fields are rejected if not regionally supported or if updated post-send. | `docs/paypal-samples/v3-invoice-fetch.json` |
| **Is cancel + recreate fallback needed?** | **YES, absolutely mandatory.** Settle cannot rely on in-place partial payment updates on SENT invoices. Settle's fallback successfully cancels the original invoice and creates an instalment invoice. | `verify:2` (created replacement invoice `INV2-Z3DH-WNKX-5SN8-HBPP`) |
| **Exact field path for payer link** | 1. Returned in `POST /v2/invoicing/invoices/{id}/send` body: `links[].href where rel === "payer-view"`<br>2. Constructed URL: `https://www.sandbox.paypal.com/invoice/p/#{invoice_id}` | `docs/paypal-samples/v1-sent-invoice.json` & `verify:3` |
| **How does payment behave when the buyer pays?** | Status immediately flips from `SENT` $\rightarrow$ `PAID`. The `payments` object records `paid_amount` (`currency_code` + `value`) and `transactions[]` with `payment_id`, `amount`, `payment_date`, and `method`. | `docs/paypal-samples/v5-after-partial-payment.json` |
| **What do reminders allow / restrict?** | `POST /v2/invoicing/invoices/{id}/remind` returns `204 No Content` for `SENT` invoices. It rejects drafts or already-paid invoices. Requires `send_to_recipient: true`. | `docs/paypal-samples/v4-reminder-result.json` |
| **Which webhook events fire and in what order?** | Webhook subscriptions registered: `INVOICING.INVOICE.PAID`, `INVOICING.INVOICE.UPDATED`, `INVOICING.INVOICE.CANCELLED`, `INVOICING.INVOICE.REFUNDED`. Webhook signature verification verified via `/v1/notifications/verify-webhook-signature`. | Webhook ID `7YN52924WB9361439` |
| **What does `@paypal/agent-toolkit` cover vs. direct REST?** | Toolkit exposes only 3 basic tools: `create_invoice`, `delete_invoice`, `update_invoicing`. It **lacks** `sendInvoice`, `cancelInvoice`, `sendReminder`, `getInvoice`, `listInvoices`, and partial payment. Direct REST is required for 8/8 core Settle workflows. | `docs/paypal-samples/v6-toolkit-tools.json` |

---

## Detailed Findings by Verification Step

### 1. `verify:1` — Invoice Creation & Send
- **Endpoint:** `POST /v2/invoicing/invoices` $\rightarrow$ `POST /v2/invoicing/invoices/{id}/send`
- **Initial Response:** `POST /v2/invoicing/invoices` does not return the full invoice entity; it returns HTTP 201 with `{ rel: "self", href: ".../invoices/{id}", method: "GET" }`. Our library extracts the ID and calls `getInvoice` to return the complete typed object.
- **Regulatory Discovery (RBI / Foreign Currency):** Invoicing a sandbox recipient without a billing address or using an Indian personal buyer in USD caused:
  ```json
  {
    "issue": "INR_FOREIGN_CURRENCY_BLOCKED",
    "description": "We're unable to send invoices to customers within India. You can still send PayPal invoices to international customers outside of India."
  }
  ```
  **Fix implemented:** Adding a US billing address (`country_code: "US"`) and using a US sandbox buyer account satisfies PayPal's export regulations.

### 2. `verify:2` — Updating Sent Invoice & Partial Payment
- **Endpoint:** `PUT /v2/invoicing/invoices/{id}`
- **Result:** Failed with `400 Bad Request`:
  ```json
  {
    "field": "/configuration/partial_payment/allow_partial_payment",
    "value": "true",
    "description": "Partial payments are not available in your country."
  }
  ```
- **Fallback Verification:** Settle's fallback cancelled the original $1,000 invoice (`INV2-ARZ8-TD3G-KP53-KUGX`) via `POST /cancel` and created an instalment invoice (`INV2-Z3DH-WNKX-5SN8-HBPP`) for $300.00 representing Instalment 1 of 2.
- **Architectural Takeaway:** PayPal's native `allow_partial_payment` is regionally restricted. Settle's multi-invoice instalment architecture is the only universally reliable way to offer structured payment plans globally.

### 3. `verify:3` — Payer Link Confirmation
- **Merchant Links vs. Payer Links:** `GET /v2/invoicing/invoices/{id}` returns merchant action links (`self`, `replace`, `cancel`, `remind`, `record-payment`, `qr-code`).
- **Payer Link Path:** The buyer's payment link is returned when calling `POST /send`:
  `https://www.sandbox.paypal.com/invoice/p/#<INVOICE_ID>`

### 4. `verify:4` — Reminder Endpoint
- **Endpoint:** `POST /v2/invoicing/invoices/{id}/remind`
- **Response:** `204 No Content`.
- **Behavior:** PayPal dispatches an email reminder to the buyer. Can only be invoked on `SENT` / `UNPAID` invoices.

### 5. `verify:5` — Live Buyer Payment
- **Sandbox Buyer Payment:** Payer link opened and $300.00 paid via sandbox buyer `sb-ld6d853530407@personal.example.com`.
- **Status Change:** Invoice status updated to `PAID` with balance due `$0.00`.
- **Transaction Recorded:**
  ```json
  {
    "paid_amount": { "currency_code": "USD", "value": "300.00" },
    "transactions": [
      {
        "type": "PAYPAL",
        "payment_id": "0A49277430839300J",
        "amount": { "currency_code": "USD", "value": "300.00" },
        "payment_date": "2026-10-23",
        "method": "PAYPAL"
      }
    ]
  }
  ```

### 6. `verify:6` — `@paypal/agent-toolkit` Smoke Test
- **Module:** `@paypal/agent-toolkit/ai-sdk` (installed and instantiated).
- **Tools Discovered:** `create_invoice`, `delete_invoice`, `update_invoicing`.
- **Gap Analysis:**
  | Required Settle Capability | Toolkit Support | Direct REST Needed? |
  |---|---|---|
  | Send Invoice (`/send`) | ❌ No | **Yes** |
  | Cancel Invoice (`/cancel`) | ❌ No | **Yes** |
  | Send Reminder (`/remind`) | ❌ No | **Yes** |
  | Get Invoice (`GET /invoices/{id}`) | ❌ No | **Yes** |
  | List Invoices (`GET /invoices`) | ❌ No | **Yes** |
  | Webhook Verification | ❌ No | **Yes** |
  | Partial Payment / Instalments | ❌ No | **Yes** |
- **Conclusion:** While `@paypal/agent-toolkit` provides basic draft creation, Settle's agent must rely on our custom typed REST library (`src/lib/paypal/invoices.ts`) for all mission-critical operations.

---

## Architectural Recommendations for Phase 2–4

1. **Model Instalments as Multi-Invoice Chains in DB:**
   Because PayPal native partial payment is geographically restricted, Settle should model payment plans as linked chains of PayPal invoices:
   - Invoice 1 (Original $1,000) $\rightarrow$ Cancelled upon agreement.
   - Invoice 1a ($300 Deposit, Due Today) $\rightarrow$ Generated & Sent.
   - Invoice 1b ($700 Balance, Due in 30 Days) $\rightarrow$ Scheduled in Settle DB, auto-sent upon payment webhook of 1a.
2. **Always Use Cryptographic Webhook Verification:**
   PayPal's `/v1/notifications/verify-webhook-signature` API reliably verifies transmission signatures in sandbox. Keep `PAYPAL_WEBHOOK_VERIFY=true`.
3. **Keep `sync` as a Heartbeat / Safety Net:**
   Webhooks can be subject to delays or network glitches; our `POST /api/paypal/sync` route and `pnpm run sync` command ensure instant self-healing.
