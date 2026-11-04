import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agentLogs, invoices, messages } from "@/db/schema";
import { eq, desc, asc, inArray } from "drizzle-orm";

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
        paymentPlans: {
          with: {
            instalments: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Lookup recipientViewUrls for any linked sub-invoices
    const subInvoicePaypalIds: string[] = [];
    if (invoice.paymentPlans) {
      for (const plan of invoice.paymentPlans) {
        for (const inst of plan.instalments) {
          if (inst.paypalInvoiceId) {
            subInvoicePaypalIds.push(inst.paypalInvoiceId);
          }
        }
      }
    }

    const subInvoicesMap: Record<
      string,
      { id: string; recipientViewUrl?: string | null; paypalStatus?: string | null }
    > = {};

    if (subInvoicePaypalIds.length > 0) {
      const subInvoices = await db.query.invoices.findMany({
        where: inArray(invoices.paypalInvoiceId, subInvoicePaypalIds),
      });
      for (const sub of subInvoices) {
        subInvoicesMap[sub.paypalInvoiceId] = {
          id: sub.id,
          recipientViewUrl: sub.recipientViewUrl,
          paypalStatus: sub.paypalStatus,
        };
      }
    }

    // Attach sub-invoice details to instalments and sort by leg number
    const enrichedPaymentPlans = invoice.paymentPlans.map((plan) => ({
      ...plan,
      instalments: [...plan.instalments]
        .sort((a, b) => a.instalmentNumber - b.instalmentNumber)
        .map((inst) => {
          const subData = inst.paypalInvoiceId ? subInvoicesMap[inst.paypalInvoiceId] : undefined;
          return {
            ...inst,
            subInvoiceId: subData?.id,
            recipientViewUrl: subData?.recipientViewUrl ?? null,
            paypalStatus: subData?.paypalStatus ?? null,
          };
        }),
    }));

    const logs = await db.query.agentLogs.findMany({
      where: eq(agentLogs.invoiceId, id),
      orderBy: [desc(agentLogs.createdAt)],
    });

    const invoiceMessages = await db.query.messages.findMany({
      where: eq(messages.invoiceId, id),
      orderBy: [asc(messages.createdAt)],
    });

    return NextResponse.json({
      invoice: {
        ...invoice,
        paymentPlans: enrichedPaymentPlans,
      },
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
