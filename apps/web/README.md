# Settle — Autonomous AI Collections Agent for PayPal

Settle is an AI collections agent for freelancers who invoice through PayPal. It reads a client's reply to an overdue invoice, offers a payment plan inside guardrails set by the freelancer, creates the plan in PayPal, and escalates anything outside policy.

**Core Safety Principle**: The AI agent only proposes; server-side code strictly enforces the owner's guardrails. Client messages are untrusted input. Operates in PayPal SANDBOX only.

---

## Authentication & Security Architecture

1. **Manual Email & Password Authentication**:
   - **Registration**: Collects Full Name, Email, and Password (min 8 chars).
   - **Password Security**: Passwords are encrypted using Node.js `crypto.scrypt` with a random 16-byte salt, formatted as `salt:hexKey`, and verified using constant-time comparison (`crypto.timingSafeEqual`).
2. **Access & Refresh Token System**:
   - **Access Token**: Short-lived (15 minutes) signed JWT stored in an `httpOnly`, `sameSite=lax`, `secure` cookie (`settle_session`).
   - **Refresh Token**: Long-lived (30 days) cryptographically random 64-hex string stored in `settle_refresh_token` cookie, with its SHA-256 hash stored in the `refresh_tokens` database table.
   - **Automatic Refresh & Rotation**: When the access token expires, server requests automatically rotate and refresh the session without interrupting the user. Logout revokes the token in the database.
3. **PayPal Sandbox Authentication (Alternative / Silent)**:
   - "Log in with PayPal" button remains available on the login page as a secondary option for OAuth/sandbox testing.
4. **Onboarding Wizard Integration**:
   - Newly registered users (`onboarding_completed_at IS NULL`) are automatically gated to `/onboarding`.
   - Returning users who completed onboarding proceed directly to `/dashboard`.
5. **Safety Policy**:
   - Client disputes and financial hardship cases are permanently locked to "Always On" on the server and cannot be disabled.

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
# Database
DATABASE_URL="postgresql://..."

# PayPal Sandbox Credentials
PAYPAL_CLIENT_ID="your_sandbox_client_id"
PAYPAL_CLIENT_SECRET="your_sandbox_client_secret"
PAYPAL_ENVIRONMENT="SANDBOX"
PAYPAL_WEBHOOK_ID="your_webhook_id"
PAYPAL_WEBHOOK_VERIFY="true"

# App & Auth
APP_BASE_URL="http://localhost:3000"
NODE_ENV="development"
SESSION_SECRET="your_min_32_character_random_session_secret"
PAYPAL_LOGIN_REDIRECT_URI="http://localhost:3000/api/auth/paypal/callback"

# Optional AI Key (for direct Anthropic tool use)
ANTHROPIC_API_KEY="sk-ant-..."

# Optional Email Channel (Resend)
RESEND_API_KEY="re_..."
RESEND_WEBHOOK_SECRET="whsec_..."
INBOUND_EMAIL_DOMAIN="inbound.settle.app"
EMAIL_FROM="Settle Collections <notifications@settle.app>"
EMAIL_CHANNEL_ENABLED="false"
MAX_AGENT_REPLIES_PER_INVOICE_PER_DAY="5"
```

---

## Real Email Channel (Optional via Resend)

Settle supports real email communications alongside the simulated client inbox (`/demo/client-inbox`). By default, `EMAIL_CHANNEL_ENABLED="false"` so that the simulated demo flow remains 100% operational with no external email dependencies.

### Inbound Routing & Security
1. **Unique Per-Invoice Reply Tokens**: Each invoice has a random 32-character hex `replyToken`. Client outbound emails set `Reply-To: reply+{replyToken}@{INBOUND_EMAIL_DOMAIN}`.
2. **Untrusted Input Handling**: Inbound HTML is never rendered in the dashboard. Inbound text is stripped of quoted reply histories and mobile signatures, truncated to 4,000 characters, and scanned for prompt injection attacks.
3. **Loop Prevention**: Automatically rejects auto-replies (`Auto-Submitted`, `Precedence: bulk/junk`, `X-Autoreply`, mailer-daemon, out-of-office subjects).
4. **Sender Verification**: The `From` address must match the client email on file. Mismatches are immediately escalated to the owner's Approvals Queue with no automated reply.
5. **Rate Limiting**: Capped at `MAX_AGENT_REPLIES_PER_INVOICE_PER_DAY` (default: 5) per invoice per 24 hours.

### Dev Tooling & Testing
- Navigate to `http://localhost:3000/dev/email` to inspect recent emails and trigger mock inbound events via the built-in simulator.
- View architectural payloads and full findings in `docs/email-findings.md`.

---

## Quick Start

### 1. Run Development Server
```bash
cd apps/web && pnpm dev
```
Navigate to `http://localhost:3000`.

---

## Testing

Run the full unit test suite (Password hashing, Session JWT, Refresh token, Auth gating, Guardrails validation):
```bash
cd apps/web && ./node_modules/vitest/vitest.mjs run
```

Type checking:
```bash
cd apps/web && ./node_modules/.bin/tsc --noEmit
```

Production build:
```bash
cd apps/web && ./node_modules/.bin/next build --webpack
```

---

## Manual End-to-End Testing Walkthrough

Follow these steps in your browser:

### Scenario 1: New User Registration & Onboarding
1. Open `http://localhost:3000/login` in an Incognito window.
2. Click the **"Create Account"** tab at the top of the card.
3. Enter your details:
   - **Full Name**: e.g. `Elena Rostova`
   - **Email Address**: e.g. `elena@designstudio.dev`
   - **Password**: e.g. `Password123!` (at least 8 characters)
4. Click **"Create Account & Onboard"**.
5. **Expected**:
   - Account is created, password is scrypt-hashed, and both access (`settle_session`) and refresh (`settle_refresh_token`) cookies are set.
   - You are immediately redirected to `http://localhost:3000/onboarding` (Step 1).
6. **Step 1 ("Confirm your details")**:
   - Notice the **"Account Connected"** banner displaying your registered name and email.
   - Timezone is automatically detected from your browser.
   - Click **"Continue to Rules"**.
7. **Step 2 ("Set your rules")**:
   - Configure your limits: Max instalments (e.g. 4), Min deposit (e.g. 30%), Max plan days (e.g. 60).
   - Disputes and hardship rows remain permanently locked "Always on".
   - Click **"Continue to Tone & Review"**.
8. **Step 3 ("Communication Tone & Consent")**:
   - Select your preferred tone (Friendly / Neutral / Firm).
   - Check the required authorization checkbox and click **"Finish Setup"**.
9. **Expected**:
   - Redirected to `http://localhost:3000/dashboard?welcome=true` with a green completion banner.
   - Top navigation displays your name: `Elena Rostova`.

### Scenario 2: Returning User Login
1. In the dashboard, click the Log Out button in the header (or visit `/dashboard/settings#account` and click "Log out").
2. Return to `http://localhost:3000/login`.
3. In the **"Sign In"** tab, enter your registered email and password.
4. Click **"Sign In"**.
5. **Expected**: Because onboarding was completed, you are redirected directly to `http://localhost:3000/dashboard`.

### Scenario 3: Alternative Sign-in Options
1. On `http://localhost:3000/login`, under *"or continue with"*:
   - Click **"Log in with PayPal (Sandbox)"** to launch the sandbox mock OAuth onboarding flow.
   - Click **"Continue with the demo workspace"** to jump straight into the demo workspace with pre-populated invoices.
