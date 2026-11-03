import { env } from "../env";
import crypto from "crypto";

export interface SendEmailPayload {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  id: string;
  simulated?: boolean;
  error?: string;
}

export interface ReceivedEmailDetails {
  id: string;
  from: string;
  to: string[];
  subject: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string>;
  createdAt?: string;
}

/**
 * Dispatches an outbound email via Resend's REST API.
 * When EMAIL_CHANNEL_ENABLED is false, no network request is made;
 * instead, a simulated dispatch is logged.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const from = payload.from || env.EMAIL_FROM;
  const to = Array.isArray(payload.to) ? payload.to : [payload.to];

  // 1. Check if email channel is enabled
  if (!env.EMAIL_CHANNEL_ENABLED) {
    const mockId = `sim_outbound_${crypto.randomUUID().slice(0, 12)}`;
    // Only log metadata, never full email bodies at info level
    console.log(
      `[email/outbound] (Disabled: EMAIL_CHANNEL_ENABLED=false) Simulated email to=${to.join(
        ", "
      )} subject="${payload.subject}" replyTo=${payload.replyTo || "none"} id=${mockId}`
    );
    return { id: mockId, simulated: true };
  }

  // 2. Real dispatch via Resend
  if (!env.RESEND_API_KEY) {
    console.error("[email/outbound] RESEND_API_KEY is not configured.");
    return { id: "", error: "RESEND_API_KEY is missing." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: payload.replyTo,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        headers: payload.headers,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[email/outbound] Resend API error:", data);
      return { id: "", error: data?.message || "Failed to send email via Resend" };
    }

    console.log(`[email/outbound] Dispatched email to=${to.join(", ")} resend_id=${data.id}`);
    return { id: data.id, simulated: false };
  } catch (error) {
    console.error("[email/outbound] Network error sending email:", error);
    return {
      id: "",
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Fetches the full contents of a received email using Resend's Receiving API.
 */
export async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmailDetails | null> {
  if (!env.RESEND_API_KEY) {
    console.warn(`[email/receiving] RESEND_API_KEY is missing; cannot fetch email ${emailId}`);
    return null;
  }

  try {
    const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error(`[email/receiving] Failed to fetch email ${emailId}:`, errData);
      return null;
    }

    const data = await res.json();
    return {
      id: data.id,
      from: data.from,
      to: Array.isArray(data.to) ? data.to : [data.to],
      subject: data.subject || "",
      html: data.html || null,
      text: data.text || null,
      headers: data.headers || {},
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error(`[email/receiving] Network error fetching email ${emailId}:`, error);
    return null;
  }
}

/**
 * Verifies the Svix cryptographic signature sent with Resend webhooks.
 */
export function verifyResendWebhookSignature(params: {
  rawBody: string;
  headers: {
    id?: string | null;
    timestamp?: string | null;
    signature?: string | null;
  };
  secret?: string;
}): boolean {
  const secret = params.secret || env.RESEND_WEBHOOK_SECRET;
  const { id, timestamp, signature } = params.headers;

  if (!id || !timestamp || !signature || !secret) {
    return false;
  }

  // Verify timestamp is within 5 minutes (300 seconds)
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    return false;
  }

  try {
    const cleanSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const secretBytes = Buffer.from(cleanSecret, "base64");

    const toSign = `${id}.${timestamp}.${params.rawBody}`;
    const hmac = crypto.createHmac("sha256", secretBytes);
    hmac.update(toSign);
    const expectedSig = hmac.digest("base64");

    const signatures = signature.split(" ");
    for (const sig of signatures) {
      const [version, hash] = sig.split(",");
      if (version === "v1" && hash) {
        const hashBuf = Buffer.from(hash);
        const expectedBuf = Buffer.from(expectedSig);
        if (
          hashBuf.length === expectedBuf.length &&
          crypto.timingSafeEqual(hashBuf, expectedBuf)
        ) {
          return true;
        }
      }
    }
  } catch (err) {
    console.error("[email/webhook] Error during signature verification:", err);
    return false;
  }

  return false;
}
