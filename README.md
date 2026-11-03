# Settle

**AI-powered collections agent for freelancers and small businesses using PayPal.**

Settle goes beyond reminders. It reads client replies, negotiates payment plans within your guardrails, creates those plans in PayPal, and escalates anything it shouldn't decide on its own.

> ⚠️ **Sandbox only.** This app is hard-coded to PayPal's sandbox environment. It will refuse to start against a live PayPal account.

---

## Why it exists

~59% of small business invoices are 30+ days overdue. Existing tools send reminders. Settle closes the loop on negotiation and settlement — in the payment rail, with owner-controlled rules.

---

## Architecture

```
Next.js 16 (App Router, TypeScript strict, Tailwind)
  └── src/
       ├── lib/
       │   ├── env.ts              # Zod-validated env, SANDBOX enforcement
       │   ├── invoice-upsert.ts   # DB ↔ PayPal sync helper
       │   └── paypal/
       │       ├── client.ts       # OAuth token cache + fetch wrapper
       │       ├── invoices.ts     # All invoice operations
       │       ├── status.ts       # PayPal → internal status mapping
       │       └── types.ts        # Zod schemas from real API responses
       ├── db/
       │   ├── schema.ts           # Drizzle schema (Clients, Invoices, WebhookEvents)
       │   └── index.ts            # DB client
       └── app/
           ├── api/
           │   ├── webhooks/paypal/ # Webhook handler (signature verify, idempotency)
           │   └── paypal/sync/     # Sync fallback endpoint
           └── dev/                 # Dev status page (non-production only)
```

---

## Local Setup

### Prerequisites

- Node.js ≥ 24
- pnpm ≥ 11
- Docker & docker-compose (for local Postgres)
- A [PayPal Developer](https://developer.paypal.com/) account with a sandbox app
- [ngrok](https://ngrok.com/) (for webhook testing)

### 1. Clone and install

```sh
git clone https://github.com/your-org/settle.git
cd settle
pnpm install
```

### 2. Start the database

```sh
docker compose up -d
```

The Postgres instance will be available at:
```
postgresql://settle:settle@localhost:5432/settle
```

### 3. Set up environment variables

```sh
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` with your values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (default above works for docker-compose) |
| `PAYPAL_CLIENT_ID` | From PayPal Developer Dashboard → your sandbox app |
| `PAYPAL_CLIENT_SECRET` | From PayPal Developer Dashboard → your sandbox app |
| `PAYPAL_ENVIRONMENT` | Must be `SANDBOX` |
| `PAYPAL_WEBHOOK_ID` | From PayPal → Webhooks (see step 6 below) |
| `PAYPAL_WEBHOOK_VERIFY` | `true` in prod, `false` only in dev for local testing without ngrok |
| `APP_BASE_URL` | Your ngrok URL e.g. `https://abc123.ngrok-free.app` |
| `PAYPAL_BUYER_EMAIL` | Your sandbox buyer account email (for verify scripts) |

### 4. Run migrations

```sh
cd apps/web
pnpm db:generate
pnpm db:migrate
```

### 5. Start the dev server

```sh
# From repo root:
pnpm dev --filter=web
# Or from apps/web:
pnpm dev
```

App runs at http://localhost:3000. Dev status page: http://localhost:3000/dev

### 6. Set up ngrok for webhooks

```sh
ngrok http 3000
```

Copy the forwarding URL (e.g. `https://abc123.ngrok-free.app`) and:
1. Set `APP_BASE_URL=https://abc123.ngrok-free.app` in `.env`
2. In PayPal Developer Dashboard → Webhooks → Add Webhook:
   - **URL**: `https://abc123.ngrok-free.app/api/webhooks/paypal`
   - **Events to subscribe**:
     - `INVOICING.INVOICE.PAID`
     - `INVOICING.INVOICE.UPDATED`
     - `INVOICING.INVOICE.CANCELLED`
     - `INVOICING.INVOICE.REFUNDED`
3. Copy the **Webhook ID** → set `PAYPAL_WEBHOOK_ID=...` in `.env`

### 7. Run verification scripts

```sh
cd apps/web

# Create and send a test invoice
pnpm verify:1

# Save the invoice ID printed, then:
export PAYPAL_TEST_INVOICE_ID=INV-...

# Test partial payment enablement
pnpm verify:2

# Confirm payer URL and partial payment settings
pnpm verify:3

# Send a reminder
pnpm verify:4

# Manual payment step (follow on-screen instructions)
pnpm verify:5

# Agent toolkit smoke test
pnpm verify:6
```

Results are saved to `docs/phase1-findings.md` and raw responses to `docs/paypal-samples/`.

### 8. Run unit tests

```sh
cd apps/web
pnpm test
```

### 9. Sync invoices from PayPal

```sh
cd apps/web
# Sync all:
pnpm sync

# Sync one:
pnpm sync -- --invoiceId=INV-XXXX
```

---

## Database Scripts

| Command | Description |
|---|---|
| `pnpm db:generate` | Generate SQL migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio in browser |

---

## PayPal Sandbox Accounts

You need **two** sandbox accounts:
1. **Business (seller)** — linked to your REST app (the invoicer)
2. **Personal (buyer)** — to pay invoices in verify:5

Create these at: https://developer.paypal.com/dashboard/accounts

---

## License

MIT — see [LICENSE](./LICENSE)
# settle
