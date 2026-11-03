import { paypalFetch } from "./client";
import {
  PaypalInvoiceSchema,
  InvoiceListResponseSchema,
  InvoiceNumberSchema,
  parseInvoiceSummary,
  centsToDec,
  VerifyWebhookResponseSchema,
  type PaypalInvoice,
} from "./types";
import { PAYPAL_BASE_URL } from "../env";

// ─── Generate Invoice Number ──────────────────────────────────────────────────
export async function generateInvoiceNumber(): Promise<string> {
  const { data } = await paypalFetch<unknown>(
    "/v2/invoicing/generate-next-invoice-number",
    { method: "POST" }
  );
  const parsed = InvoiceNumberSchema.safeParse(data);
  if (parsed.success) return parsed.data.invoice_number;
  // Fallback to timestamp-based number if parsing fails
  return `INV-${Date.now()}`;
}

// ─── Create Draft Invoice ─────────────────────────────────────────────────────
export interface CreateInvoiceParams {
  invoiceNumber?: string;
  recipientEmail: string;
  recipientName?: string;
  recipientAddress?: {
    addressLine1?: string;
    adminArea2?: string;
    adminArea1?: string;
    postalCode?: string;
    countryCode?: string;
  };
  itemName: string;
  itemDescription?: string;
  totalAmountCents: number;
  currency?: string;
  dueDateStr: string; // YYYY-MM-DD
  note?: string;
  memo?: string;
}

export async function createDraftInvoice(
  params: CreateInvoiceParams
): Promise<PaypalInvoice> {
  const invoiceNumber =
    params.invoiceNumber ?? (await generateInvoiceNumber());
  const currency = params.currency ?? "USD";

  const body = {
    detail: {
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().slice(0, 10),
      payment_term: {
        term_type: "DUE_ON_DATE_SPECIFIED",
        due_date: params.dueDateStr,
      },
      currency_code: currency,
      note: params.note,
      memo: params.memo,
    },
    primary_recipients: [
      {
        billing_info: {
          email_address: params.recipientEmail,
          ...(params.recipientName
            ? { name: { full_name: params.recipientName } }
            : {}),
          address: {
            address_line_1:
              params.recipientAddress?.addressLine1 ?? "123 Main Street",
            admin_area_2: params.recipientAddress?.adminArea2 ?? "San Jose",
            admin_area_1: params.recipientAddress?.adminArea1 ?? "CA",
            postal_code: params.recipientAddress?.postalCode ?? "95131",
            country_code: params.recipientAddress?.countryCode ?? "US",
          },
        },
      },
    ],
    items: [
      {
        name: params.itemName,
        description: params.itemDescription,
        quantity: "1",
        unit_amount: {
          currency_code: currency,
          value: centsToDec(params.totalAmountCents),
        },
        unit_of_measure: "HOURS",
      },
    ],
  };

  const { data } = await paypalFetch<{ href?: string; id?: string; rel?: string }>(
    "/v2/invoicing/invoices",
    {
      method: "POST",
      body,
    }
  );

  // PayPal Invoicing v2 POST returns: { rel: "self", href: ".../INV2-...", method: "GET" }
  let createdId = data.id;
  if (!createdId && data.href) {
    const parts = data.href.split("/");
    createdId = parts[parts.length - 1];
  }

  if (createdId) {
    return getInvoice(createdId);
  }

  return PaypalInvoiceSchema.parse(data);
}

// ─── Send Invoice ─────────────────────────────────────────────────────────────
export async function sendInvoice(
  invoiceId: string,
  sendToRecipient = true
): Promise<string | null> {
  const { data } = await paypalFetch<{ href?: string; rel?: string }>(
    `/v2/invoicing/invoices/${invoiceId}/send`,
    {
      method: "POST",
      body: {
        send_to_recipient: sendToRecipient,
      },
    }
  );
  if (data?.href && data.rel === "payer-view") {
    return data.href;
  }
  return `https://www.sandbox.paypal.com/invoice/p/#${invoiceId}`;
}

// ─── Get Invoice ──────────────────────────────────────────────────────────────
export async function getInvoice(invoiceId: string): Promise<PaypalInvoice> {
  const { data } = await paypalFetch<unknown>(
    `/v2/invoicing/invoices/${invoiceId}`
  );
  return PaypalInvoiceSchema.parse(data);
}

// ─── List Invoices ────────────────────────────────────────────────────────────
export async function listInvoices(params?: {
  page?: number;
  pageSize?: number;
  totalCountRequired?: boolean;
}): Promise<PaypalInvoice[]> {
  const qs = new URLSearchParams({
    page: String(params?.page ?? 1),
    page_size: String(params?.pageSize ?? 20),
    total_count_required: String(params?.totalCountRequired ?? true),
  });
  const { data } = await paypalFetch<unknown>(
    `/v2/invoicing/invoices?${qs.toString()}`
  );
  const parsed = InvoiceListResponseSchema.parse(data);
  return parsed.items ?? [];
}

// ─── Update Invoice ───────────────────────────────────────────────────────────
export async function updateInvoice(
  invoiceId: string,
  updates: Partial<PaypalInvoice> & { sendToRecipient?: boolean }
): Promise<PaypalInvoice> {
  const { sendToRecipient: _send, ...invoiceUpdates } = updates;
  const qs = new URLSearchParams({
    send_to_recipient: String(_send ?? false),
    send_to_invoicer: "false",
  });
  const { data } = await paypalFetch<Record<string, unknown>>(
    `/v2/invoicing/invoices/${invoiceId}?${qs.toString()}`,
    { method: "PUT", body: invoiceUpdates }
  );
  if (data && typeof data === "object" && "id" in data && "detail" in data) {
    return PaypalInvoiceSchema.parse(data);
  }
  return getInvoice(invoiceId);
}

// ─── Cancel Invoice ───────────────────────────────────────────────────────────
export async function cancelInvoice(
  invoiceId: string,
  note?: string
): Promise<void> {
  await paypalFetch(`/v2/invoicing/invoices/${invoiceId}/cancel`, {
    method: "POST",
    body: { send_to_recipient: false, note },
  });
}

// ─── Send Reminder ────────────────────────────────────────────────────────────
export async function sendReminder(
  invoiceId: string,
  note?: string
): Promise<void> {
  await paypalFetch(`/v2/invoicing/invoices/${invoiceId}/remind`, {
    method: "POST",
    body: {
      send_to_recipient: true,
      note: note ?? "Just a friendly reminder that this invoice is due.",
    },
  });
}

// ─── Enable Partial Payment ───────────────────────────────────────────────────
/**
 * Enables partial payment on an invoice by fetching the current invoice,
 * merging partial payment config, and calling PUT.
 *
 * IMPORTANT: PayPal only allows updating DRAFT invoices.
 * For SENT invoices, the API may reject configuration changes.
 * We try anyway and record the result.
 */
export async function enablePartialPayment(
  invoiceId: string,
  minimumAmountDueCents: number,
  newDueDate?: string,
  currency = "USD"
): Promise<PaypalInvoice> {
  const current = await getInvoice(invoiceId);

  const updated: Partial<PaypalInvoice> = {
    ...current,
    configuration: {
      ...current.configuration,
      partial_payment: {
        allow_partial_payment: true,
        minimum_amount_due: {
          currency_code: currency,
          value: centsToDec(minimumAmountDueCents),
        },
      },
    },
  };

  if (newDueDate && updated.detail) {
    updated.detail = {
      ...updated.detail,
      payment_term: {
        ...updated.detail.payment_term,
        term_type: "DUE_ON_DATE_SPECIFIED",
        due_date: newDueDate,
      },
    };
  }

  return updateInvoice(invoiceId, updated);
}

// ─── Extract Payer View URL ───────────────────────────────────────────────────
export function extractPayerViewUrl(invoice: PaypalInvoice): string | null {
  const fromLinks = invoice.links?.find((l) => l.rel === "payer-view")?.href;
  if (fromLinks) return fromLinks;
  if (invoice.id) {
    return `https://www.sandbox.paypal.com/invoice/p/#${invoice.id}`;
  }
  return null;
}

// ─── Verify Webhook Signature ─────────────────────────────────────────────────
export interface WebhookVerifyParams {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
  webhookId: string;
  webhookEvent: unknown;
}

export async function verifyWebhookSignature(
  params: WebhookVerifyParams
): Promise<boolean> {
  const body = {
    transmission_id: params.transmissionId,
    transmission_time: params.transmissionTime,
    cert_url: params.certUrl,
    auth_algo: params.authAlgo,
    transmission_sig: params.transmissionSig,
    webhook_id: params.webhookId,
    webhook_event: params.webhookEvent,
  };

  const { data } = await paypalFetch<unknown>(
    "/v1/notifications/verify-webhook-signature",
    { method: "POST", body }
  );

  const parsed = VerifyWebhookResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error("Unexpected verify-webhook-signature response:", data);
    return false;
  }
  return parsed.data.verification_status === "SUCCESS";
}

export { parseInvoiceSummary };
