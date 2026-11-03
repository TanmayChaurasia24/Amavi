import { z } from "zod";

// ─── Money helpers ────────────────────────────────────────────────────────────
/** PayPal sends money as "1000.00" strings. Parse → integer cents. */
export function decimalToCents(decimal: string | undefined | null): number {
  if (!decimal) return 0;
  return Math.round(parseFloat(decimal) * 100);
}

/** Integer cents → PayPal decimal string "10.00" */
export function centsToDec(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ─── Shared amount schema ─────────────────────────────────────────────────────
export const AmountSchema = z.object({
  currency_code: z.string(),
  value: z.string(),
});
export type Amount = z.infer<typeof AmountSchema>;

// ─── Partial Payment ──────────────────────────────────────────────────────────
export const PartialPaymentSchema = z
  .object({
    allow_partial_payment: z.boolean().optional(),
    minimum_amount_due: AmountSchema.optional(),
  })
  .optional();

// ─── Invoice Line Item ────────────────────────────────────────────────────────
export const InvoiceItemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  quantity: z.string(),
  unit_amount: AmountSchema,
  tax: z
    .object({
      name: z.string().optional(),
      percent: z.string().optional(),
      amount: AmountSchema.optional(),
    })
    .optional(),
  item_date: z.string().optional(),
  unit_of_measure: z.string().optional(),
});

// ─── Invoicer info ────────────────────────────────────────────────────────────
export const InvoicerInfoSchema = z.object({
  name: z
    .object({
      given_name: z.string().optional(),
      surname: z.string().optional(),
      full_name: z.string().optional(),
    })
    .optional(),
  email_address: z.string().optional(),
  business_name: z.string().optional(),
  address: z.record(z.string(), z.unknown()).optional(),
  phones: z.array(z.record(z.string(), z.unknown())).optional(),
  website: z.string().optional(),
  tax_id: z.string().optional(),
  logo_url: z.string().optional(),
  additional_notes: z.string().optional(),
});

// ─── Recipient info ───────────────────────────────────────────────────────────
export const RecipientInfoSchema = z.object({
  billing_info: z
    .object({
      name: z
        .object({
          given_name: z.string().optional(),
          surname: z.string().optional(),
          full_name: z.string().optional(),
        })
        .optional(),
      email_address: z.string().optional(),
      business_name: z.string().optional(),
      address: z.record(z.string(), z.unknown()).optional(),
      additional_info: z.string().optional(),
    })
    .optional(),
  shipping_info: z.record(z.string(), z.unknown()).optional(),
});

// ─── Invoice Amount breakdown ─────────────────────────────────────────────────
export const InvoiceAmountSchema = z.object({
  currency_code: z.string(),
  value: z.string(),
  breakdown: z
    .object({
      item_total: AmountSchema.optional(),
      discount: z.record(z.string(), z.unknown()).optional(),
      tax_total: AmountSchema.optional(),
      shipping: z.record(z.string(), z.unknown()).optional(),
      custom: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

// ─── Payment detail ───────────────────────────────────────────────────────────
export const PaymentDetailSchema = z.object({
  type: z.string().optional(),
  payment_id: z.string().optional(),
  transaction_fee: AmountSchema.optional(),
  amount: AmountSchema.optional(),
  payment_date: z.string().optional(),
  method: z.string().optional(),
  note: z.string().optional(),
});

// ─── Payments ─────────────────────────────────────────────────────────────────
export const InvoicePaymentsSchema = z.object({
  paid_amount: AmountSchema.optional(),
  transactions: z.array(PaymentDetailSchema).optional(),
});

// ─── Link ─────────────────────────────────────────────────────────────────────
export const LinkSchema = z.object({
  href: z.string(),
  rel: z.string(),
  method: z.string().optional(),
  media_type: z.string().optional(),
});

// ─── Full Invoice ─────────────────────────────────────────────────────────────
export const PaypalInvoiceSchema = z.object({
  id: z.string(),
  parent_id: z.string().optional(),
  status: z.string(),
  detail: z.object({
    invoice_number: z.string().optional(),
    invoice_date: z.string().optional(),
    payment_term: z
      .object({
        term_type: z.string().optional(),
        due_date: z.string().optional(),
      })
      .optional(),
    reference: z.string().optional(),
    currency_code: z.string().optional(),
    note: z.string().optional(),
    memo: z.string().optional(),
    attachments: z.array(z.record(z.string(), z.unknown())).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  invoicer: InvoicerInfoSchema.optional(),
  primary_recipients: z.array(RecipientInfoSchema).optional(),
  items: z.array(InvoiceItemSchema).optional(),
  configuration: z
    .object({
      partial_payment: PartialPaymentSchema,
      allow_tip: z.boolean().optional(),
      tax_calculated_after_discount: z.boolean().optional(),
      tax_inclusive: z.boolean().optional(),
    })
    .optional(),
  amount: InvoiceAmountSchema.optional(),
  due_amount: AmountSchema.optional(),
  payments: InvoicePaymentsSchema.optional(),
  refunds: z.record(z.string(), z.unknown()).optional(),
  links: z.array(LinkSchema).optional(),
});

export type PaypalInvoice = z.infer<typeof PaypalInvoiceSchema>;

// ─── Invoice list response ────────────────────────────────────────────────────
export const InvoiceListResponseSchema = z.object({
  total_items: z.number().optional(),
  total_pages: z.number().optional(),
  items: z.array(PaypalInvoiceSchema).optional(),
  links: z.array(LinkSchema).optional(),
});

// ─── Invoice Summary (our normalised view) ────────────────────────────────────
export interface InvoiceSummary {
  paypalInvoiceId: string;
  paypalStatus: string;
  totalCents: number;
  paidCents: number;
  dueCents: number;
  currency: string;
  dueDate: string | null;
  payerViewUrl: string | null;
  partialPaymentEnabled: boolean;
  minimumDueCents: number | null;
}

/** Extract our normalised InvoiceSummary from a raw PayPal invoice object. */
export function parseInvoiceSummary(invoice: PaypalInvoice): InvoiceSummary {
  const payerLink =
    invoice.links?.find((l) => l.rel === "payer-view")?.href ?? null;

  const paidCents = decimalToCents(
    invoice.payments?.paid_amount?.value
  );
  const totalCents = decimalToCents(invoice.amount?.value);
  const dueCents = decimalToCents(invoice.due_amount?.value);

  const partialConfig = invoice.configuration?.partial_payment;
  const partialPaymentEnabled =
    partialConfig?.allow_partial_payment === true;
  const minimumDueCents = partialConfig?.minimum_amount_due?.value
    ? decimalToCents(partialConfig.minimum_amount_due.value)
    : null;

  return {
    paypalInvoiceId: invoice.id,
    paypalStatus: invoice.status,
    totalCents,
    paidCents,
    dueCents,
    currency: invoice.amount?.currency_code ?? "USD",
    dueDate: invoice.detail?.payment_term?.due_date ?? null,
    payerViewUrl: payerLink,
    partialPaymentEnabled,
    minimumDueCents,
  };
}

// ─── Verify Webhook Signature Request/Response ────────────────────────────────
export const VerifyWebhookResponseSchema = z.object({
  verification_status: z.enum(["SUCCESS", "FAILURE"]),
});

// ─── Invoice number response ──────────────────────────────────────────────────
export const InvoiceNumberSchema = z.object({
  invoice_number: z.string(),
});
