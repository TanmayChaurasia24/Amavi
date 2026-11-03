
### verify:5 — Partial Payment Behaviour

- Invoice status after partial payment: `PAID`
- Paid amount: `$300.00`
- Due amount: `$0.00`
- payments.paid_amount.value: `300.00`
- payments.transactions count: `1`
- minimum_amount_due still set: `undefined`
- Result: PASS

### verify:6 — Agent Toolkit Coverage

- Tools available (3): `create_invoice`, `delete_invoice`, `update_invoicing`
- Operations covered by toolkit: none
- Operations requiring direct REST: `createInvoice`, `getInvoice`, `listInvoices`, `updateInvoice`, `sendInvoice`, `cancelInvoice`, `sendReminder`, `enablePartialPayment`
- Recommendation: Use toolkit where available; keep direct REST for partial payment and reminders.
- Result: PASS
