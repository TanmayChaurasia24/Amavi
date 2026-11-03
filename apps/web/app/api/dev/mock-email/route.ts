import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { env } from "@/lib/env";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev endpoints disabled in production" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { invoiceId, senderEmail, text, isAutoReply, isMismatchedSender } = body;

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      with: { client: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: `Invoice ${invoiceId} not found` }, { status: 404 });
    }

    const token = invoice.replyToken || crypto.randomUUID().replace(/-/g, "");
    const emailId = `dev_email_${crypto.randomUUID().slice(0, 16)}`;
    const fromAddress = isMismatchedSender
      ? "attacker_or_other@unknown.org"
      : senderEmail || invoice.client?.email || "client@example.com";

    const webhookPayload = {
      type: "email.received",
      created_at: new Date().toISOString(),
      data: {
        id: emailId,
        from: fromAddress,
        to: [`reply+${token}@${env.INBOUND_EMAIL_DOMAIN}`],
        subject: isAutoReply ? "Automatic reply: Out of office" : `Re: Invoice #${invoice.paypalInvoiceId}`,
        text: text || "Can I pay in 3 monthly installments?",
        html: null,
        headers: isAutoReply
          ? {
              "Auto-Submitted": "auto-replied",
              "Message-ID": `<${emailId}@test.settle.app>`,
            }
          : {
              "Message-ID": `<${emailId}@test.settle.app>`,
            },
      },
    };

    const rawBody = JSON.stringify(webhookPayload);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Generate Svix mock signature if secret exists
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "svix-id": emailId,
      "svix-timestamp": timestamp,
    };

    if (env.RESEND_WEBHOOK_SECRET) {
      const cleanSecret = env.RESEND_WEBHOOK_SECRET.startsWith("whsec_")
        ? env.RESEND_WEBHOOK_SECRET.slice(6)
        : env.RESEND_WEBHOOK_SECRET;
      const secretBytes = Buffer.from(cleanSecret, "base64");
      const toSign = `${emailId}.${timestamp}.${rawBody}`;
      const sig = crypto.createHmac("sha256", secretBytes).update(toSign).digest("base64");
      headers["svix-signature"] = `v1,${sig}`;
    }

    // Call internal webhook handler directly
    const webhookUrl = new URL("/api/webhooks/email", req.url).toString();
    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: rawBody,
    });

    const resJson = await webhookRes.json().catch(() => ({ status: webhookRes.status }));
    return NextResponse.json({
      success: webhookRes.ok,
      status: webhookRes.status,
      simulatedEmailId: emailId,
      tokenUsed: token,
      result: resJson,
    });
  } catch (error) {
    console.error("[dev/mock-email] Error executing mock webhook:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

