import { describe, it, expect } from "vitest";
import { calculateInvoiceRisk } from "../lib/risk";

describe("calculateInvoiceRisk", () => {
  const refDate = new Date("2026-10-25T12:00:00Z");

  it("returns zero risk for fully paid invoices", () => {
    const risk = calculateInvoiceRisk({
      totalCents: 100000,
      amountPaidCents: 100000,
      dueDate: "2026-09-01",
      status: "PAID",
      pastLateCount: 4,
      avgDaysLate: 20,
      referenceDate: refDate,
    });

    expect(risk.score).toBe(0);
    expect(risk.level).toBe("LOW");
    expect(risk.daysOverdue).toBe(0);
  });

  it("returns low risk for current open invoice with clean client history", () => {
    const risk = calculateInvoiceRisk({
      totalCents: 45000, // $450
      dueDate: "2026-11-05", // future
      status: "OPEN",
      pastLateCount: 0,
      avgDaysLate: 0,
      referenceDate: refDate,
    });

    expect(risk.level).toBe("LOW");
    expect(risk.score).toBeLessThanOrEqual(25);
    expect(risk.daysOverdue).toBe(0);
  });

  it("escalates risk for moderately overdue invoice with past late history", () => {
    const risk = calculateInvoiceRisk({
      totalCents: 200000, // $2,000
      dueDate: "2026-10-05", // 20 days overdue relative to Oct 25
      status: "OVERDUE",
      pastLateCount: 2,
      avgDaysLate: 8,
      referenceDate: refDate,
    });

    expect(risk.level).toMatch(/HIGH|MEDIUM/);
    expect(risk.score).toBeGreaterThan(40);
    expect(risk.daysOverdue).toBe(20);
  });

  it("marks severely overdue (>60d) large invoices as CRITICAL", () => {
    const risk = calculateInvoiceRisk({
      totalCents: 450000, // $4,500
      dueDate: "2026-08-01", // ~85 days overdue
      status: "OVERDUE",
      pastLateCount: 4,
      avgDaysLate: 25,
      referenceDate: refDate,
    });

    expect(risk.level).toBe("CRITICAL");
    expect(risk.score).toBeGreaterThanOrEqual(76);
  });

  it("factors in active disputes heavily", () => {
    const risk = calculateInvoiceRisk({
      totalCents: 320000, // $3,200
      dueDate: "2026-10-20", // 5 days overdue
      status: "DISPUTED",
      pastLateCount: 1,
      avgDaysLate: 5,
      referenceDate: refDate,
    });

    expect(risk.level).toMatch(/HIGH|CRITICAL/);
    expect(risk.factors.some((f) => f.name.includes("Dispute"))).toBe(true);
  });
});
