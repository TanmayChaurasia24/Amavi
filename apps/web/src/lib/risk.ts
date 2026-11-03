export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskInput {
  totalCents: number;
  amountPaidCents?: number;
  dueDate: string | null; // ISO YYYY-MM-DD
  status: string; // OPEN, OVERDUE, IN_NEGOTIATION, PARTIALLY_PAID, PAID, DISPUTED, CANCELLED
  pastLateCount?: number;
  avgDaysLate?: number;
  referenceDate?: Date; // allows deterministic testing
}

export interface RiskFactor {
  name: string;
  points: number;
  description: string;
}

export interface RiskAssessment {
  score: number; // 0 to 100
  level: RiskLevel;
  label: string;
  color: {
    bg: string;
    text: string;
    border: string;
    dot: string;
    badgeClass: string;
  };
  factors: RiskFactor[];
  daysOverdue: number;
}

/**
 * Calculates a 0-100 risk score and risk tier based on:
 * 1. Days overdue
 * 2. Unpaid amount at risk
 * 3. Client payment history (past late count & avg days late)
 * 4. Current dispute or negotiation status
 */
export function calculateInvoiceRisk(input: RiskInput): RiskAssessment {
  const {
    totalCents,
    amountPaidCents = 0,
    dueDate,
    status,
    pastLateCount = 0,
    avgDaysLate = 0,
    referenceDate = new Date(),
  } = input;

  // Settled / closed invoices have zero risk
  if (status === "PAID") {
    return {
      score: 0,
      level: "LOW",
      label: "Low Risk",
      color: getRiskColor("LOW"),
      factors: [
        {
          name: "Invoice Settled",
          points: 0,
          description: "Full payment received and verified",
        },
      ],
      daysOverdue: 0,
    };
  }

  if (status === "CANCELLED") {
    return {
      score: 0,
      level: "LOW",
      label: "Voided",
      color: getRiskColor("LOW"),
      factors: [
        {
          name: "Invoice Cancelled",
          points: 0,
          description: "Invoice was cancelled or superseded",
        },
      ],
      daysOverdue: 0,
    };
  }

  const factors: RiskFactor[] = [];
  let totalPoints = 0;

  // 1. Days overdue
  let daysOverdue = 0;
  if (dueDate) {
    // Parse YYYY-MM-DD cleanly to UTC midnight
    const [y, m, d] = dueDate.split("-").map(Number);
    if (y && m && d) {
      const dueUtc = Date.UTC(y, m - 1, d);
      const refUtc = Date.UTC(
        referenceDate.getUTCFullYear(),
        referenceDate.getUTCMonth(),
        referenceDate.getUTCDate()
      );
      if (refUtc > dueUtc) {
        daysOverdue = Math.round((refUtc - dueUtc) / (1000 * 60 * 60 * 24));
      }
    }
  }

  if (daysOverdue > 60) {
    totalPoints += 50;
    factors.push({
      name: "Severe Delinquency",
      points: 50,
      description: `${daysOverdue} days overdue (>60d default hazard)`,
    });
  } else if (daysOverdue > 30) {
    totalPoints += 35;
    factors.push({
      name: "High Overdue",
      points: 35,
      description: `${daysOverdue} days overdue (31-60d threshold)`,
    });
  } else if (daysOverdue > 14) {
    totalPoints += 25;
    factors.push({
      name: "Moderate Overdue",
      points: 25,
      description: `${daysOverdue} days overdue (15-30d threshold)`,
    });
  } else if (daysOverdue > 0) {
    totalPoints += 15;
    factors.push({
      name: "Initial Overdue",
      points: 15,
      description: `${daysOverdue} days overdue (1-14d grace period)`,
    });
  } else {
    factors.push({
      name: "On Track",
      points: 0,
      description: "Invoice is not yet past due date",
    });
  }

  // 2. Unpaid Balance at Risk
  const unpaidCents = Math.max(0, totalCents - amountPaidCents);
  if (unpaidCents > 300000) {
    // > $3,000
    totalPoints += 20;
    factors.push({
      name: "High Exposure",
      points: 20,
      description: `Large unpaid balance: $${(unpaidCents / 100).toFixed(2)} (> $3,000)`,
    });
  } else if (unpaidCents > 150000) {
    // $1,500 - $3,000
    totalPoints += 15;
    factors.push({
      name: "Medium Exposure",
      points: 15,
      description: `Significant balance: $${(unpaidCents / 100).toFixed(2)} ($1,500 - $3,000)`,
    });
  } else if (unpaidCents >= 50000) {
    // $500 - $1,500
    totalPoints += 10;
    factors.push({
      name: "Standard Balance",
      points: 10,
      description: `Standard invoice amount: $${(unpaidCents / 100).toFixed(2)}`,
    });
  } else {
    // < $500
    totalPoints += 5;
    factors.push({
      name: "Low Exposure",
      points: 5,
      description: `Small balance: $${(unpaidCents / 100).toFixed(2)} (< $500)`,
    });
  }

  // 3. Client Payment History
  if (pastLateCount >= 3) {
    totalPoints += 20;
    factors.push({
      name: "Habitual Late Payer",
      points: 20,
      description: `Client had ${pastLateCount} past overdue invoices`,
    });
  } else if (pastLateCount > 0) {
    totalPoints += 10;
    factors.push({
      name: "Occasional Late Payer",
      points: 10,
      description: `Client had ${pastLateCount} past overdue invoice(s)`,
    });
  }

  if (avgDaysLate > 14) {
    totalPoints += 10;
    factors.push({
      name: "High Historical Delay",
      points: 10,
      description: `Client averages ${avgDaysLate} days late on past payments`,
    });
  } else if (avgDaysLate > 5) {
    totalPoints += 5;
    factors.push({
      name: "Moderate Historical Delay",
      points: 5,
      description: `Client averages ${avgDaysLate} days late on past payments`,
    });
  }

  // 4. Status Multipliers
  if (status === "DISPUTED") {
    totalPoints += 30;
    factors.push({
      name: "Payment Disputed",
      points: 30,
      description: "Client officially contested invoice or scope",
    });
  } else if (status === "IN_NEGOTIATION") {
    totalPoints += 10;
    factors.push({
      name: "Active Negotiation",
      points: 10,
      description: "Payment terms under active discussion",
    });
  }

  const score = Math.min(100, Math.max(0, totalPoints));

  let level: RiskLevel = "LOW";
  let label = "Low Risk";
  if (score >= 76) {
    level = "CRITICAL";
    label = "Critical Risk";
  } else if (score >= 51) {
    level = "HIGH";
    label = "High Risk";
  } else if (score >= 26) {
    level = "MEDIUM";
    label = "Medium Risk";
  }

  return {
    score,
    level,
    label,
    color: getRiskColor(level),
    factors,
    daysOverdue,
  };
}

export function getRiskColor(level: RiskLevel) {
  switch (level) {
    case "CRITICAL":
      return {
        bg: "bg-red-500/10",
        text: "text-red-400",
        border: "border-red-500/30",
        dot: "bg-red-500",
        badgeClass:
          "bg-rose-950/40 text-rose-300 border-rose-500/30 hover:border-rose-500/60",
      };
    case "HIGH":
      return {
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        border: "border-orange-500/30",
        dot: "bg-orange-500",
        badgeClass:
          "bg-amber-950/40 text-amber-300 border-amber-500/30 hover:border-amber-500/60",
      };
    case "MEDIUM":
      return {
        bg: "bg-yellow-500/10",
        text: "text-yellow-400",
        border: "border-yellow-500/30",
        dot: "bg-yellow-500",
        badgeClass:
          "bg-yellow-950/40 text-yellow-300 border-yellow-500/30 hover:border-yellow-500/60",
      };
    case "LOW":
    default:
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
        dot: "bg-emerald-500",
        badgeClass:
          "bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/60",
      };
  }
}
