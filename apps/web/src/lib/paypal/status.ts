import type { InvoiceStatus } from "../../db/schema";
import type { InvoiceSummary } from "./types";

/**
 * Maps a PayPal invoice status + due date + amounts to our internal status.
 *
 * PayPal statuses observed:
 *   DRAFT | SENT | SCHEDULED | PARTIALLY_PAID | PAID | MARKED_AS_PAID |
 *   CANCELLED | REFUNDED | UNPAID | PAYMENT_PENDING
 */
export function mapPaypalStatusToInternal(
  summary: Pick<
    InvoiceSummary,
    "paypalStatus" | "dueDate" | "paidCents" | "totalCents" | "dueCents"
  >
): InvoiceStatus {
  const { paypalStatus, dueDate, paidCents, totalCents } = summary;
  const s = paypalStatus.toUpperCase();

  switch (s) {
    case "DRAFT":
      return "OPEN";

    case "PAID":
    case "MARKED_AS_PAID":
      return "PAID";

    case "PARTIALLY_PAID":
      return "PARTIALLY_PAID";

    case "CANCELLED":
      return "CANCELLED";

    case "REFUNDED":
      // A refunded invoice may have been fully paid before; treat as cancelled
      return "CANCELLED";

    case "SENT":
    case "UNPAID":
    case "SCHEDULED":
    case "PAYMENT_PENDING": {
      // Check overdue
      if (dueDate) {
        const due = new Date(dueDate);
        due.setUTCHours(23, 59, 59, 999); // end of due day
        if (Date.now() > due.getTime()) {
          // If any partial payment exists, it's partially paid + overdue,
          // but our enum doesn't have OVERDUE+PARTIALLY_PAID so prefer PARTIALLY_PAID
          if (paidCents > 0 && paidCents < totalCents) {
            return "PARTIALLY_PAID";
          }
          return "OVERDUE";
        }
      }
      if (paidCents > 0 && paidCents < totalCents) {
        return "PARTIALLY_PAID";
      }
      return "OPEN";
    }

    default:
      // Unknown PayPal status: fall back to OPEN
      return "OPEN";
  }
}
