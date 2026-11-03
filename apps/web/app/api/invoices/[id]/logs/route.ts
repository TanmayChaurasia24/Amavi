import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agentLogs, invoices, messages } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        client: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const logs = await db.query.agentLogs.findMany({
      where: eq(agentLogs.invoiceId, id),
      orderBy: [desc(agentLogs.createdAt)],
    });

    const invoiceMessages = await db.query.messages.findMany({
      where: eq(messages.invoiceId, id),
      orderBy: [asc(messages.createdAt)],
    });

    return NextResponse.json({
      invoice,
      logs,
      messages: invoiceMessages,
    });
  } catch (error) {
    console.error("[api/invoices/logs] Error fetching invoice logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
