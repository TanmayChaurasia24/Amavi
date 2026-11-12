# Amavi — Web Application & Services

This directory contains the main web application and backend API services for **Amavi**, an autonomous AI collections agent for freelancers using PayPal.

For full architectural documentation, judge evaluation scenarios, and system diagrams, please refer to the primary [Root README](../../README.md).

---

## 🏗️ Directory Structure

```
apps/web/
├── app/
│   ├── (auth)/login/             # Auth pages (Registration, Sign In, Sandbox OAuth)
│   ├── api/                      # Next.js API Routes
│   │   ├── approvals/            # Human-in-the-Loop approval decisions
│   │   ├── auth/                 # Session & refresh token endpoints
│   │   ├── invoices/             # Invoice query & client reply ingestion
│   │   ├── paypal/sync/          # Live PayPal sync engine
│   │   └── webhooks/             # PayPal & Resend webhook receivers
│   ├── dashboard/                # AG Grid invoice dashboard & guardrail settings
│   ├── demo/                     # Simulated client inbox & testbed
│   ├── onboarding/               # Multi-step onboarding wizard
│   └── layout.tsx                # App layout & font configurations
├── src/
│   ├── components/               # AG Grid wrappers, audit drawers, landing sections
│   ├── db/                       # Drizzle ORM schema, relations & client
│   ├── lib/
│   │   ├── agent/                # Intent classifier, guardrails, tools, runner
│   │   ├── auth/                 # Password scrypt hashing & JWT verification
│   │   ├── email/                # Inbound token parsing & transactional templates
│   │   ├── paypal/               # PayPal Invoicing REST client & status mappers
│   │   └── risk.ts               # Deterministic risk assessment engine
│   └── __tests__/                # Vitest test suites (97+ tests)
└── scripts/                      # PayPal sandbox verification & seed scripts
```

---

## ⚡ Quick Start

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Seed demo data
pnpm seed

# Start development server
pnpm dev
```

App runs at `http://localhost:3000`.

---

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run type check
pnpm check-types
```
