import { describe, it, expect } from "vitest";
import { mapPaypalStatusToInternal } from "../lib/paypal/status";

type TestInput = {
  paypalStatus: string;
  dueDate: string | null;
  paidCents: number;
  totalCents: number;
  dueCents: number;
};

function map(input: TestInput) {
  return mapPaypalStatusToInternal(input);
}

const yesterday = new Date(Date.now() - 86_400_000)
  .toISOString()
  .slice(0, 10);
const tomorrow = new Date(Date.now() + 86_400_000)
  .toISOString()
  .slice(0, 10);

describe("mapPaypalStatusToInternal", () => {
  it("DRAFT → OPEN", () => {
    expect(
      map({ paypalStatus: "DRAFT", dueDate: tomorrow, paidCents: 0, totalCents: 100_00, dueCents: 100_00 })
    ).toBe("OPEN");
  });

  it("SENT with future due date → OPEN", () => {
    expect(
      map({ paypalStatus: "SENT", dueDate: tomorrow, paidCents: 0, totalCents: 100_00, dueCents: 100_00 })
    ).toBe("OPEN");
  });

  it("UNPAID with future due date → OPEN", () => {
    expect(
      map({ paypalStatus: "UNPAID", dueDate: tomorrow, paidCents: 0, totalCents: 100_00, dueCents: 100_00 })
    ).toBe("OPEN");
  });

  it("SENT with past due date and no payment → OVERDUE", () => {
    expect(
      map({ paypalStatus: "SENT", dueDate: yesterday, paidCents: 0, totalCents: 100_00, dueCents: 100_00 })
    ).toBe("OVERDUE");
  });

  it("UNPAID with past due date and no payment → OVERDUE", () => {
    expect(
      map({ paypalStatus: "UNPAID", dueDate: yesterday, paidCents: 0, totalCents: 100_00, dueCents: 70_00 })
    ).toBe("OVERDUE");
  });

  it("PARTIALLY_PAID → PARTIALLY_PAID", () => {
    expect(
      map({ paypalStatus: "PARTIALLY_PAID", dueDate: tomorrow, paidCents: 30_00, totalCents: 100_00, dueCents: 70_00 })
    ).toBe("PARTIALLY_PAID");
  });

  it("SENT with past due date but partial payment → PARTIALLY_PAID", () => {
    expect(
      map({ paypalStatus: "SENT", dueDate: yesterday, paidCents: 30_00, totalCents: 100_00, dueCents: 70_00 })
    ).toBe("PARTIALLY_PAID");
  });

  it("PAID → PAID", () => {
    expect(
      map({ paypalStatus: "PAID", dueDate: yesterday, paidCents: 100_00, totalCents: 100_00, dueCents: 0 })
    ).toBe("PAID");
  });

  it("MARKED_AS_PAID → PAID", () => {
    expect(
      map({ paypalStatus: "MARKED_AS_PAID", dueDate: tomorrow, paidCents: 100_00, totalCents: 100_00, dueCents: 0 })
    ).toBe("PAID");
  });

  it("CANCELLED → CANCELLED", () => {
    expect(
      map({ paypalStatus: "CANCELLED", dueDate: null, paidCents: 0, totalCents: 100_00, dueCents: 100_00 })
    ).toBe("CANCELLED");
  });

  it("REFUNDED → CANCELLED", () => {
    expect(
      map({ paypalStatus: "REFUNDED", dueDate: null, paidCents: 0, totalCents: 100_00, dueCents: 100_00 })
    ).toBe("CANCELLED");
  });

  it("SENT with no due date and no payment → OPEN", () => {
    expect(
      map({ paypalStatus: "SENT", dueDate: null, paidCents: 0, totalCents: 100_00, dueCents: 100_00 })
    ).toBe("OPEN");
  });
});
