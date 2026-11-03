import { eq } from "drizzle-orm";
import { db } from "../db";
import { invoices, clients } from "../db/schema";
import type { NewInvoice } from "../db/schema";
import { parseInvoiceSummary } from "./paypal/types";
import { mapPaypalStatusToInternal } from "./paypal/status";
import { getInvoice } from "./paypal/invoices";
import type { PaypalInvoice } from "./paypal/types";

/**
 * Given a PayPal invoice object, upsert into our DB invoices table.
 * Returns the updated/inserted invoice row.
 */
export async function upsertInvoiceFromPaypal(
  paypalInvoice: PaypalInvoice
): Promise<typeof invoices.$inferSelect> {
  const summary = parseInvoiceSummary(paypalInvoice);
  const internalStatus = mapPaypalStatusToInternal(summary);

  const recipientEmail =
    paypalInvoice.primary_recipients?.[0]?.billing_info?.email_address;

  // Try to find or create a client record
  let clientId: string | null = null;
  if (recipientEmail) {
    const existingClient = await db.query.clients.findFirst({
      where: eq(clients.email, recipientEmail),
    });
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const recipientName =
        paypalInvoice.primary_recipients?.[0]?.billing_info?.name?.full_name ??
        recipientEmail;
      const [newClient] = await db
        .insert(clients)
        .values({ name: recipientName, email: recipientEmail })
        .returning();
      clientId = newClient?.id ?? null;
    }
  }

  const invoiceData: NewInvoice = {
    paypalInvoiceId: summary.paypalInvoiceId,
    clientId,
    totalCents: summary.totalCents,
    amountPaidCents: summary.paidCents,
    currency: summary.currency,
    dueDate: summary.dueDate ?? undefined,
    status: internalStatus,
    paypalStatus: summary.paypalStatus,
    recipientViewUrl: summary.payerViewUrl ?? undefined,
    updatedAt: new Date(),
  };

  // Upsert: insert or update on conflict
  const [result] = await db
    .insert(invoices)
    .values(invoiceData)
    .onConflictDoUpdate({
      target: invoices.paypalInvoiceId,
      set: {
        clientId: invoiceData.clientId,
        totalCents: invoiceData.totalCents,
        amountPaidCents: invoiceData.amountPaidCents,
        currency: invoiceData.currency,
        dueDate: invoiceData.dueDate,
        status: invoiceData.status,
        paypalStatus: invoiceData.paypalStatus,
        recipientViewUrl: invoiceData.recipientViewUrl,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!result) throw new Error("Upsert returned no row");
  return result;
}

import { reconcilePaymentWithPlans } from "./agent/reconcile";

/**
 * Fetch invoice from PayPal by ID, then upsert into our DB.
 * Reconciles payments with multi-installment plans automatically.
 * Use this from webhooks and the sync endpoint.
 */
export async function fetchAndUpsertInvoice(
  paypalInvoiceId: string
): Promise<typeof invoices.$inferSelect> {
  const paypalInvoice = await getInvoice(paypalInvoiceId);
  const row = await upsertInvoiceFromPaypal(paypalInvoice);

  // If status is PAID or PARTIALLY_PAID, reconcile with any multi-installment plan
  if (row.status === "PAID" || row.status === "PARTIALLY_PAID" || row.amountPaidCents > 0) {
    try {
      await reconcilePaymentWithPlans(paypalInvoiceId, row.amountPaidCents);
    } catch (reconcileErr) {
      console.warn(
        `[fetchAndUpsertInvoice] Reconciliation notice for ${paypalInvoiceId}:`,
        reconcileErr instanceof Error ? reconcileErr.message : reconcileErr
      );
    }
  }

  return row;
}
