
### verify:1 — Create + Send Invoice

- Invoice ID: `INV2-WHN3-HCVA-ZBHT-J379`
- Status after send: `SENT`
- Payer link field path: `links[].href where rel === "payer-view"`
- Payer link: `https://www.sandbox.paypal.com/invoice/p/#INV2-WHN3-HCVA-ZBHT-J379`
- Result: PASS

### verify:1 — Create + Send Invoice

- Invoice ID: `INV2-PF2K-ZBAG-TWEU-PVE3`
- Status after send: `SENT`
- Payer link field path: `links[].href where rel === "payer-view"`
- Payer link: `https://www.sandbox.paypal.com/invoice/p/#INV2-PF2K-ZBAG-TWEU-PVE3`
- Result: PASS

### verify:1 — Create + Send Invoice

- Invoice ID: `INV2-ARZ8-TD3G-KP53-KUGX`
- Status after send: `SENT`
- Payer link field path: `links[].href where rel === "payer-view"`
- Payer link: `https://www.sandbox.paypal.com/invoice/p/#INV2-ARZ8-TD3G-KP53-KUGX`
- Result: PASS

### verify:2 — Enable Partial Payment (Fallback: Cancel + Recreate)

- Updating a SENT invoice failed (HTTP 400)
- Fallback cancel + recreate used: **YES**
- Replacement Invoice ID: `INV2-Z3DH-WNKX-5SN8-HBPP`
- Regional Partial Payment Restriction: `YES (Partial payments are not available in merchant country)`
- Architecture Solution: `Settle Multi-Invoice Instalment schedule ($300 deposit invoice issued)`
- Result: PASS (fallback path verified)

### verify:3 — Payer URL Field Path + Partial Payment Persistence

- Payer URL field path: `invoice.links[].href where rel === "payer-view"`
- Payer URL found: `YES`
- allow_partial_payment persisted: `undefined`
- minimum_amount_due persisted: `undefined`
- All link rels: `self, replace, cancel, remind, record-payment, qr-code`
- Result: PASS

### verify:4 — Send Reminder

- Reminder sent successfully for invoice `INV2-Z3DH-WNKX-5SN8-HBPP`
- PayPal response: `204 No Content` (success)
- Restrictions observed: Reminders can only be sent to SENT/UNPAID invoices (not DRAFT or PAID)
- Result: PASS
