import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleClientMessage } from "@/lib/agent/runner";

const MessageInputSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty"),
  senderEmail: z.string().email().optional(),
  senderName: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = MessageInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const response = await handleClientMessage({
      invoiceId: id,
      text: parsed.data.content,
      channel: "inbox",
      senderEmail: parsed.data.senderEmail,
      senderName: parsed.data.senderName,
    });

    return NextResponse.json({
      success: true,
      result: response.agentResult,
      replyText: response.replyText,
      inboundMessageId: response.inboundMessageId,
      outboundMessageId: response.outboundMessageId,
    });
  } catch (error) {
    console.error("[api/invoices/message] Error processing inbound message:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process message",
      },
      { status: 500 }
    );
  }
}
