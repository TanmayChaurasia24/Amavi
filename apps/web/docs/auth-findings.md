# Auth & Identity Architecture: Log in with PayPal

## 1. Overview & Security Boundaries

**Settle** uses "Log in with PayPal" strictly for **Identity & Authentication (OAuth 2.0 / OpenID Connect)**.

> [!IMPORTANT]
> **Identity vs. Account Authorization**:
> "Log in with PayPal" authenticates who the freelancer is (name, email, unique PayPal payer ID). It **does not grant permissions to create or alter invoices inside the user's personal PayPal account**.
> In this prototype, invoices and payment plans are created and managed via Settle's managed PayPal Sandbox business account, tagged with the owner's unique `owner_id`.
> At no point does Settle ask for or store PayPal account passwords, bank/card credentials, tax IDs, or OAuth refresh tokens with wallet access.

---

## 2. PayPal Sandbox OAuth Flow Specification

### A. Authorization URL
- **Endpoint**: `https://www.sandbox.paypal.com/connect`
- **Parameters**:
  - `flowEntry=static`
  - `client_id={PAYPAL_CLIENT_ID}`
  - `response_type=code`
  - `scope=openid profile email`
  - `redirect_uri={PAYPAL_LOGIN_REDIRECT_URI}`
  - `state={CRYPTOGRAPHIC_RANDOM_STATE}`

### B. Token Exchange
- **Method**: `POST`
- **Endpoint**: `https://api-m.sandbox.paypal.com/v1/oauth2/token`
- **Headers**:
  - `Authorization`: `Basic base64(client_id:client_secret)`
  - `Content-Type`: `application/x-www-form-urlencoded`
- **Body**:
  - `grant_type=authorization_code`
  - `code={AUTHORIZATION_CODE}`

### C. User Profile Inspection (UserInfo)
- **Method**: `GET`
- **Endpoint**: `https://api-m.sandbox.paypal.com/v1/identity/oauth2/userinfo?schema=paypalv1.1`
- **Headers**:
  - `Authorization`: `Bearer {ACCESS_TOKEN}`
- **Expected Shape (Redacted Sample)**:
```json
{
  "user_id": "https://www.paypal.com/webapps/auth/identity/user/PAYER_ID_XYZ123",
  "sub": "PAYER_ID_XYZ123",
  "name": "Jane Freelancer",
  "given_name": "Jane",
  "family_name": "Freelancer",
  "email": "jane.freelancer@example.com",
  "verified_account": "true"
}
```

---

## 3. Session Management

- **Algorithm**: `HS256` signed JWT via the universal `jose` library.
- **Cookie Security**:
  - Name: `settle_session`
  - `httpOnly`: true (inaccessible to JavaScript)
  - `sameSite`: `lax`
  - `secure`: true in production
  - `path`: `/`
  - `maxAge`: 7 days (604,800 seconds)
- **Session Payload**:
  - `ownerId`: Unique ID referencing the `owners` table (`owners.id`)
  - `isDemo`: Boolean flag indicating if viewing seeded demo workspace
  - `onboardingCompleted`: Boolean flag indicating completed onboarding wizard

---

## 4. Onboarding Gating Architecture

```mermaid
flowchart TD
    Login[User visits /login] --> ClickLogin[Clicks 'Log in with PayPal']
    ClickLogin --> FreshOwner[Auth Callback or Test Flow]
    FreshOwner --> CheckStatus{Onboarding Completed?}
    CheckStatus -- No --> Onboarding[/onboarding Wizard]
    CheckStatus -- Yes --> Dashboard[/dashboard]
    
    subgraph Onboarding Wizard
      Step1[Step 1: Confirm Identity & Timezone] --> Step2[Step 2: Set Guardrails & Limits]
      Step2 --> Step3[Step 3: Choose Tone & Sign Consent]
      Step3 --> Complete[Submit to /api/onboarding/complete]
    end
    
    Complete --> Dashboard
```

- Unauthenticated users attempting to visit `/dashboard` or `/onboarding` are redirected to `/login`.
- Authenticated users whose `onboardingCompletedAt` is null are gated to `/onboarding`.
- Users who completed onboarding are redirected to `/dashboard`.
- Middleware prevents open redirects: any `next` parameter must be a relative path starting with a single `/`.

---

## 5. Production Path: PayPal Partner / Commerce Platform

To allow Settle to create invoices directly within a seller's personal or business PayPal account in production:
1. **PayPal Complete Payments / Partner Onboarding**:
   - Freelancer undergoes PayPal Partner Onboarding (seller onboarding flow via PayPal REST API).
   - Grants Settle's platform account specific invoicing API permissions via OAuth 2.0 `partner_consent` / third-party authorizations.
2. **Webhooks Multi-Tenancy**:
   - Subscribe to partner-level webhook events (`INVOICING.INVOICE.PAID`, `INVOICING.INVOICE.REFUNDED`, etc.) tagged with merchant ID.
3. **Marketplace Compliance**:
   - Zero retention of payment credentials.
   - Owner-level data partitioning (enforced via database row-level security and `owner_id` constraints).

