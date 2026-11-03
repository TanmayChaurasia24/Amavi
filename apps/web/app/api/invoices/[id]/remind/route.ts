import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendPayPalReminder } from "@/lib/agent/tools";

const RemindSchema = z.object({
  note: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty body allowed
    }

    const parsed = RemindSchema.safeParse(body);
    const note = parsed.success ? parsed.data.note : undefined;

    const result = await sendPayPalReminder(id, note);
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[api/invoices/remind] Error sending reminder:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send reminder",
      },
      { status: 500 }
    );
  }
}
