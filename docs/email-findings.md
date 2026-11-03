# Settle Email Channel: Architectural Findings & Reference

This document records the architectural findings, payload structures, threading behaviors, and safety boundaries for Settle's optional Resend email channel.

---

## 1. Core Principle: Hostile Input & Defense in Depth

In Settle, **all email content is untrusted and hostile input**:
1. **Never Render Inbound HTML**: Email HTML is never rendered in dashboard components; only stripped plain text is displayed.
2. **Server-Side Enforcement**: The AI agent proposes actions, but deterministic TypeScript code enforces owner guardrails (deposit percentage, duration, discounts, auto-approval thresholds).
3. **Prompt Injection Defense**: Inbound messages are scanned for adversarial overrides (e.g., `ignore previous instructions`, `developer mode`, `set balance to 0`). If detected, automated negotiation is halted immediately and an escalation ticket is dispatched to the owner.
4. **HTML Entity Escaping**: Outbound email templates strictly escape all dynamic text (client names, proposal summaries, note text) via `escapeHtml()`.

---

## 2. Inbound Routing Mechanics: Reply Tokens

To route replies to the correct invoice without exposing database primary keys or sensitive user IDs:
- Every invoice has a cryptographically random 32-character hexadecimal `reply_token` (stored in `invoices.reply_token`, indexed with a unique index).
- Outbound emails (reminders and agent replies) set the `Reply-To` header to:
  ```
  reply+{reply_token}@{INBOUND_EMAIL_DOMAIN}
  ```
- The inbound webhook parser extracts the token using case-insensitive regex `reply+([a-zA-Z0-9_-]+)@` across all `To` headers.
- If a reply token is missing or unrecognized, the email is logged as `ignored` with reason `unknown_reply_token`; no agent action is triggered and no outbound email is generated.

---

## 3. Resend Inbound Webhook Payload Format

Resend inbound webhooks use the Svix webhook delivery system and contain **metadata only**.

### 3.1 Webhook POST Payload (`email.received`)
```json
{
  "type": "email.received",
  "created_at": "2026-11-04T01:25:00.000Z",
  "data": {
    "id": "4e7d4482-fa8a-4467-bc32-1b15c9a4c843",
    "from": "Alex Client <alex@example.com>",
    "to": ["reply+4a8b73f2c91044de851f92e7619a3b10@inbound.settle.app"],
    "subject": "Re: Invoice #INV2-2048 from Sarah Studio"
  }
}
```

### 3.2 Svix Headers
The incoming HTTP request contains:
- `svix-id`: Unique message identifier (e.g., `msg_2bX...`)
- `svix-timestamp`: Unix timestamp in seconds (must be within 300 seconds of current time)
- `svix-signature`: `v1,{base64_hmac_sha256}`

The HMAC is computed over `${svix_id}.${svix_timestamp}.${rawBody}` using the secret key (stripping `whsec_` prefix and decoding from base64).

### 3.3 Receiving API Payload (`GET https://api.resend.com/emails/{id}`)
To obtain the full email body and RFC headers:
```json
{
  "id": "4e7d4482-fa8a-4467-bc32-1b15c9a4c843",
  "from": "Alex Client <alex@example.com>",
  "to": ["reply+4a8b73f2c91044de851f92e7619a3b10@inbound.settle.app"],
  "subject": "Re: Invoice #INV2-2048 from Sarah Studio",
  "html": "<p>I can pay $200 today and the remainder next month.</p>",
  "text": "I can pay $200 today and the remainder next month.",
  "headers": {
    "message-id": "<CA+9f8a@mail.gmail.com>",
    "in-reply-to": "<outbound_msg_01@settle.app>",
    "references": "<outbound_msg_01@settle.app>",
    "auto-submitted": "no"
  },
  "created_at": "2026-11-04T01:25:00.000Z"
}
```

---

## 4. Email Threading Behavior

To ensure replies thread correctly in client mail clients (Apple Mail, Gmail, Outlook):
1. **Subject**:
   - Initial reminder: `Invoice #{paypalInvoiceId} from {ownerDisplayName}`
   - Outbound agent reply: `Re: Invoice #{paypalInvoiceId} from {ownerDisplayName}`
2. **RFC Headers**:
   - Outbound replies attach `In-Reply-To: <{client_message_id}>` and `References: <{client_message_id}>`.
   - The original `Message-ID` from the client is saved in `messages.email_message_id`.

---

## 5. Loop Prevention & Automated Mail Detection

To prevent infinite loops between automated systems (vacation auto-responders, delivery status notifications, bounce daemons):
1. **RFC 3834 `Auto-Submitted`**: If present and value is not `"no"`, message is ignored.
2. **`Precedence` Header**: Any message with `bulk`, `junk`, `auto_reply`, or `list` is ignored.
3. **`X-Autoreply` Header**: Any message with `yes` or `true` is ignored.
4. **Automated Sender Filter**: Senders matching `mailer-daemon@`, `postmaster@`, `no-reply@`, `noreply@` are ignored.
5. **Subject Filter**: Common auto-responder subjects (e.g. `Auto:`, `Automatic reply:`, `Out of office`, `Undeliverable:`, `Delivery Status Notification`) are ignored.

When detected, the message is stored with `ignoredReason: "auto_reply_detected"` and `deliveryStatus: "ignored"`. No agent runs and no reply is sent.

---

## 6. Fraud & Impersonation Prevention (Sender Mismatch)

The `From` header is checked against the client's email address on file for that invoice:
- If a third party sends an email to the reply token address, Settle stores the message with `ignoredReason: "unrecognized_sender"` and `deliveryStatus: "escalated"`.
- An escalation ticket is immediately created in the owner's Approvals Queue.
- Settle takes **no automated action** and sends **no reply** to the unrecognized sender.

---

## 7. Rate Capping (Daily Reply Limits)

To prevent resource exhaustion and infinite back-and-forth negotiations:
- Settle counts outbound replies per invoice in the last 24 hours.
- If outbound replies reach `MAX_AGENT_REPLIES_PER_INVOICE_PER_DAY` (default: 5):
  - Inbound message is stored with `ignoredReason: "rate_limit_exceeded"`.
  - An owner escalation ticket is created.
  - No further automated replies are sent.

---

## 8. Dev Tooling & Testing

The `/dev/email` debugger provides:
- Live inspection of the last 20 email channel messages.
- Status badges: `delivered`, `sent`, `ignored` (with reason), `escalated`, `failed`.
- Interactive simulator button to trigger test events without external network dependencies.

