import { db } from "../src/db";
import {
  owners,
  clients,
  invoices,
  guardrails,
  approvalQueue,
  agentLogs,
  paymentPlans,
  planInstalments,
  messages,
} from "../src/db/schema";
import { calculateInvoiceRisk } from "../src/lib/risk";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Starting Amavi Phase 2 Database Seeding...");

  // 0. Seed legacy and demo owners
  console.log("  → Ensuring legacy and demo owners...");
  await db
    .insert(owners)
    .values({
      id: "owner-legacy",
      paypalPayerId: "legacy",
      email: "legacy@amavi.local",
      emailVerified: true,
      name: "Legacy Owner",
      displayName: "Legacy Owner",
      notificationEmail: "legacy@amavi.local",
      timezone: "UTC",
      tone: "friendly",
      onboardingStep: 3,
      onboardingCompletedAt: new Date(),
      isDemo: false,
    })
    .onConflictDoNothing();

  await db
    .insert(owners)
    .values({
      id: "owner-demo",
      paypalPayerId: "demo",
      email: "demo@amavi.local",
      emailVerified: true,
      name: "Demo Owner",
      displayName: "Freelance Designer",
      notificationEmail: "demo@amavi.local",
      timezone: "America/New_York",
      tone: "friendly",
      onboardingStep: 3,
      onboardingCompletedAt: new Date(),
      isDemo: true,
    })
    .onConflictDoNothing();

  // 1. Guardrails Singleton
  console.log("  → Ensuring default guardrails...");
  await db
    .insert(guardrails)
    .values({
      id: "default",
      ownerId: "owner-legacy",
      minDepositPct: 30, // 30% min deposit
      maxPlanDurationDays: 60, // 60 days max plan length
      maxInstalments: 3,
      maxDiscountPct: 0, // No discount by default
      allowDiscounts: false,
      autoApproveThresholdCents: 50000, // $500.00
      escalateOnDispute: true,
      escalateOnHardship: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: guardrails.id,
      set: {
        ownerId: "owner-legacy",
        maxInstalments: 3,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(guardrails)
    .values({
      id: "owner-demo-guardrails",
      ownerId: "owner-demo",
      minDepositPct: 30,
      maxPlanDurationDays: 60,
      maxInstalments: 3,
      maxDiscountPct: 0,
      allowDiscounts: false,
      autoApproveThresholdCents: 50000,
      escalateOnDispute: true,
      escalateOnHardship: true,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // 2. Clients
  console.log("  → Seeding clients...");
  const clientData = [
    {
      id: "client-acme",
      name: "Acme Media Group",
      email: "billing@acmemedia.example.com",
      pastLateCount: 0,
      avgDaysLate: 0,
    },
    {
      id: "client-nova",
      name: "Nova Creative Studio",
      email: "finance@novacreative.example.com",
      pastLateCount: 1,
      avgDaysLate: 4,
    },
    {
      id: "client-vanguard",
      name: "Vanguard Logistics Ltd",
      email: "ap@vanguardlogistics.example.com",
      pastLateCount: 4,
      avgDaysLate: 26,
    },
    {
      id: "client-hyperion",
      name: "Hyperion Robotics Inc",
      email: "accounts@hyperionrobotics.example.com",
      pastLateCount: 2,
      avgDaysLate: 12,
    },
    {
      id: "client-solaria",
      name: "Solaria Global Partners",
      email: "payments@solariaglobal.example.com",
      pastLateCount: 5,
      avgDaysLate: 42,
    },
  ];

  for (const c of clientData) {
    await db
      .insert(clients)
      .values({ ...c, ownerId: "owner-legacy" })
      .onConflictDoUpdate({
        target: clients.id,
        set: {
          name: c.name,
          email: c.email,
          pastLateCount: c.pastLateCount,
          avgDaysLate: c.avgDaysLate,
          ownerId: "owner-legacy",
          updatedAt: new Date(),
        },
      });
  }

  // 3. Seed Invoices with Diverse Statuses
  console.log("  → Seeding invoices across all statuses...");
  const today = new Date();
  const formatOffsetDate = (offsetDays: number) => {
    const d = new Date(today.getTime() + offsetDays * 86400000);
    return d.toISOString().split("T")[0]!;
  };

  const invoiceSeeds = [
    {
      id: "inv-seed-001",
      paypalInvoiceId: "INV2-SEED-OPEN-101",
      clientId: "client-acme",
      totalCents: 125000, // $1,250.00
      amountPaidCents: 0,
      dueDate: formatOffsetDate(14), // due in 14 days
      status: "OPEN" as const,
      paypalStatus: "SENT",
      recipientViewUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-SEED-OPEN-101",
    },
    {
      id: "inv-seed-002",
      paypalInvoiceId: "INV2-SEED-OPEN-102",
      clientId: "client-nova",
      totalCents: 380000, // $3,800.00
      amountPaidCents: 0,
      dueDate: formatOffsetDate(2), // due in 2 days
      status: "OPEN" as const,
      paypalStatus: "SENT",
      recipientViewUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-SEED-OPEN-102",
    },
    {
      id: "inv-seed-003",
      paypalInvoiceId: "INV2-SEED-OVERDUE-103",
      clientId: "client-nova",
      totalCents: 175000, // $1,750.00
      amountPaidCents: 0,
      dueDate: formatOffsetDate(-18), // 18 days overdue
      status: "OVERDUE" as const,
      paypalStatus: "SENT",
      recipientViewUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-SEED-OVERDUE-103",
    },
    {
      id: "inv-seed-004",
      paypalInvoiceId: "INV2-SEED-OVERDUE-104",
      clientId: "client-vanguard",
      totalCents: 420000, // $4,200.00
      amountPaidCents: 0,
      dueDate: formatOffsetDate(-45), // 45 days overdue
      status: "OVERDUE" as const,
      paypalStatus: "SENT",
      recipientViewUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-SEED-OVERDUE-104",
    },
    {
      id: "inv-seed-005",
      paypalInvoiceId: "INV2-SEED-NEGO-105",
      clientId: "client-hyperion",
      totalCents: 240000, // $2,400.00
      amountPaidCents: 0,
      dueDate: formatOffsetDate(-22), // 22 days overdue
      status: "IN_NEGOTIATION" as const,
      paypalStatus: "SENT",
      recipientViewUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-SEED-NEGO-105",
    },
    {
      id: "inv-seed-006",
      paypalInvoiceId: "INV2-SEED-NEGO-106",
      clientId: "client-acme",
      totalCents: 85000, // $850.00
      amountPaidCents: 0,
      dueDate: formatOffsetDate(-8), // 8 days overdue
      status: "IN_NEGOTIATION" as const,
      paypalStatus: "SENT",
      recipientViewUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-SEED-NEGO-106",
    },
    {
      id: "inv-seed-007",
      paypalInvoiceId: "INV2-SEED-PARTIAL-107",
      clientId: "client-vanguard",
      totalCents: 200000, // $2,000.00
      amountPaidCents: 60000, // $600 deposit paid
      dueDate: formatOffsetDate(-12),
      status: "PARTIALLY_PAID" as const,
      paypalStatus: "PARTIALLY_PAID",
      recipientViewUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-SEED-PARTIAL-107",
    },
    {
      id: "inv-seed-008",
      paypalInvoiceId: "INV2-SEED-DISPUTE-108",
      clientId: "client-solaria",
      totalCents: 320000, // $3,200.00
      amountPaidCents: 0,
      dueDate: formatOffsetDate(-30), // 30 days overdue
      status: "DISPUTED" as const,
      paypalStatus: "SENT",
      recipientViewUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-SEED-DISPUTE-108",
    },
    {
      id: "inv-seed-009",
      paypalInvoiceId: "INV2-SEED-PAID-109",
      clientId: "client-acme",
      totalCents: 150000, // $1,500.00
      amountPaidCents: 150000,
      dueDate: formatOffsetDate(-5),
      status: "PAID" as const,
      paypalStatus: "PAID",
      recipientViewUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-SEED-PAID-109",
    },
    {
      id: "inv-seed-010",
      paypalInvoiceId: "INV2-SEED-CANCEL-110",
      clientId: "client-solaria",
      totalCents: 75000, // $750.00
      amountPaidCents: 0,
      dueDate: formatOffsetDate(-60),
      status: "CANCELLED" as const,
      paypalStatus: "CANCELLED",
      recipientViewUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-SEED-CANCEL-110",
    },
  ];

  for (const inv of invoiceSeeds) {
    const client = clientData.find((c) => c.id === inv.clientId);
    const risk = calculateInvoiceRisk({
      totalCents: inv.totalCents,
      amountPaidCents: inv.amountPaidCents,
      dueDate: inv.dueDate,
      status: inv.status,
      pastLateCount: client?.pastLateCount ?? 0,
      avgDaysLate: client?.avgDaysLate ?? 0,
    });

    await db
      .insert(invoices)
      .values({
        ...inv,
        ownerId: "owner-legacy",
        riskScore: risk.score,
        currency: "USD",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: invoices.paypalInvoiceId,
        set: {
          clientId: inv.clientId,
          ownerId: "owner-legacy",
          totalCents: inv.totalCents,
          amountPaidCents: inv.amountPaidCents,
          dueDate: inv.dueDate,
          status: inv.status,
          riskScore: risk.score,
          paypalStatus: inv.paypalStatus,
          recipientViewUrl: inv.recipientViewUrl,
          updatedAt: new Date(),
        },
      });
  }

  // Also update risk score on any existing real PayPal invoices in DB
  const existingInvoices = await db.query.invoices.findMany({
    with: { client: true },
  });
  for (const ex of existingInvoices) {
    if (!ex.paypalInvoiceId.startsWith("INV2-SEED")) {
      const risk = calculateInvoiceRisk({
        totalCents: ex.totalCents,
        amountPaidCents: ex.amountPaidCents,
        dueDate: ex.dueDate,
        status: ex.status,
        pastLateCount: ex.client?.pastLateCount ?? 0,
        avgDaysLate: ex.client?.avgDaysLate ?? 0,
      });
      await db
        .update(invoices)
        .set({ riskScore: risk.score })
        .where(eq(invoices.id, ex.id));
    }
  }

  // 4. Payment Plan & Instalments for inv-seed-007 (Partially Paid)
  console.log("  → Seeding payment plan and instalments...");
  const [existingPlan] = await db
    .select()
    .from(paymentPlans)
    .where(eq(paymentPlans.invoiceId, "inv-seed-007"));

  let planId = existingPlan?.id;
  if (!planId) {
    const [insertedPlan] = await db
      .insert(paymentPlans)
      .values({
        id: "plan-seed-007",
        invoiceId: "inv-seed-007",
        clientId: "client-vanguard",
        totalCents: 200000,
        depositCents: 60000, // $600 deposit
        instalmentCount: 3,
        frequency: "MONTHLY",
        status: "ACTIVE",
      })
      .returning();
    planId = insertedPlan?.id;
  }

  if (planId) {
    // Clean and re-insert sample instalments
    await db.delete(planInstalments).where(eq(planInstalments.planId, planId));
    await db.insert(planInstalments).values([
      {
        planId,
        instalmentNumber: 1,
        amountCents: 60000, // Deposit
        dueDate: formatOffsetDate(-12),
        status: "PAID",
        paidAt: new Date(Date.now() - 10 * 86400000),
      },
      {
        planId,
        instalmentNumber: 2,
        amountCents: 70000,
        dueDate: formatOffsetDate(18),
        status: "PENDING",
      },
      {
        planId,
        instalmentNumber: 3,
        amountCents: 70000,
        dueDate: formatOffsetDate(48),
        status: "PENDING",
      },
    ]);
  }

  // 5. Approval Queue items
  console.log("  → Seeding approval queue items...");
  // Item 1: Pending escalation for Hyperion Robotics (Deposit too low & duration too long)
  await db
    .insert(approvalQueue)
    .values({
      id: "approval-001",
      invoiceId: "inv-seed-005",
      clientId: "client-hyperion",
      ownerId: "owner-legacy",
      proposalSummary:
        "Client proposed 15% upfront ($360.00) and 4 monthly installments over 120 days.",
      reason:
        "Deposit 15.0% is below the 30% guardrail minimum. Plan duration (120 days) exceeds 60-day limit.",
      status: "PENDING",
      actionPayload: {
        requestedDepositCents: 36000,
        requestedDepositPct: 15,
        instalmentCount: 4,
        frequency: "MONTHLY",
        durationDays: 120,
      },
      createdAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
    })
    .onConflictDoNothing();

  // Item 2: Pending escalation for Solaria Global (Dispute flagged)
  await db
    .insert(approvalQueue)
    .values({
      id: "approval-002",
      invoiceId: "inv-seed-008",
      clientId: "client-solaria",
      ownerId: "owner-legacy",
      proposalSummary:
        "Client flagged milestone deliverable dispute claiming Phase 2 deliverables incomplete.",
      reason:
        "Dispute detected: Client refuses payment until milestone review. Guardrails require immediate owner escalation.",
      status: "PENDING",
      actionPayload: {
        disputeType: "DELIVERABLE_SCOPE",
        disputedAmountCents: 320000,
        clientStatement:
          "Phase 2 report missing test metrics specified in statement of work.",
      },
      createdAt: new Date(Date.now() - 6 * 3600000), // 6 hours ago
    })
    .onConflictDoNothing();

  // Item 3: Historical Approved item for Acme Media
  await db
    .insert(approvalQueue)
    .values({
      id: "approval-003",
      invoiceId: "inv-seed-006",
      clientId: "client-acme",
      ownerId: "owner-legacy",
      proposalSummary:
        "Client requested 2 bi-weekly split payments of $425.00 each.",
      reason:
        "Plan duration within limits, but 50% deposit with 2 installments needed manual sign-off.",
      status: "APPROVED",
      actionPayload: {
        depositCents: 42500,
        instalmentCount: 2,
        frequency: "BIWEEKLY",
      },
      decidedAt: new Date(Date.now() - 24 * 3600000),
      createdAt: new Date(Date.now() - 26 * 3600000),
    })
    .onConflictDoNothing();

  // 6. Agent Logs for Audit Trail Drawer
  console.log("  → Seeding agent audit trail logs...");
  const logsToInsert = [
    // Logs for inv-seed-005 (Hyperion Robotics)
    {
      id: "log-seed-101",
      invoiceId: "inv-seed-005",
      eventType: "INVOICE_SYNC",
      reasoning:
        "Synchronized invoice status with PayPal Sandbox. Marked status as OVERDUE (22 days past due date).",
      inputPayload: { paypalInvoiceId: "INV2-SEED-NEGO-105", status: "SENT" },
      outputPayload: { internalStatus: "OVERDUE", daysOverdue: 22 },
      executionTimeMs: 145,
      createdAt: new Date(Date.now() - 12 * 3600000),
    },
    {
      id: "log-seed-102",
      invoiceId: "inv-seed-005",
      eventType: "INBOUND_ANALYZED",
      reasoning:
        "Received email response from accounts@hyperionrobotics.example.com. Classified intent as REQUEST_INSTALMENT with 96% confidence.",
      inputPayload: {
        from: "accounts@hyperionrobotics.example.com",
        body: "Cash flow is tight this quarter. Could we pay $360 right away and the remainder across 4 monthly payments?",
      },
      outputPayload: {
        intent: "REQUEST_INSTALMENT",
        proposal: { depositCents: 36000, instalmentCount: 4, durationDays: 120 },
      },
      executionTimeMs: 420,
      createdAt: new Date(Date.now() - 3 * 3600000),
    },
    {
      id: "log-seed-103",
      invoiceId: "inv-seed-005",
      eventType: "GUARDRAIL_EVALUATED",
      reasoning:
        "Proposal evaluated against active guardrails. FAILED: Proposed deposit (15.0%) is below 30% min guardrail. Plan duration (120 days) exceeds 60-day limit. Auto-approval rejected.",
      inputPayload: {
        rules: { minDepositPct: 30, maxPlanDurationDays: 60 },
        proposal: { depositPct: 15, durationDays: 120 },
      },
      outputPayload: {
        passesGuardrails: false,
        violations: ["DEPOSIT_BELOW_MINIMUM", "DURATION_EXCEEDS_MAXIMUM"],
      },
      executionTimeMs: 82,
      createdAt: new Date(Date.now() - 2 * 3600000),
    },
    {
      id: "log-seed-104",
      invoiceId: "inv-seed-005",
      eventType: "ESCALATION_DISPATCHED",
      reasoning:
        "Created Approval Ticket #approval-001 for owner review. PayPal invoice actions held pending owner approval.",
      inputPayload: { approvalTicketId: "approval-001" },
      outputPayload: { status: "AWAITING_OWNER_DECISION" },
      executionTimeMs: 65,
      createdAt: new Date(Date.now() - 2 * 3600000),
    },

    // Logs for inv-seed-008 (Solaria Global Dispute)
    {
      id: "log-seed-201",
      invoiceId: "inv-seed-008",
      eventType: "INBOUND_ANALYZED",
      reasoning:
        "Inbound message received. Intent classified as DISPUTE (confidence 0.98). Client contested deliverables.",
      inputPayload: {
        from: "payments@solariaglobal.example.com",
        body: "We will not release payment until the missing Phase 2 test metrics are delivered.",
      },
      outputPayload: { intent: "DISPUTE", category: "DELIVERABLES" },
      executionTimeMs: 380,
      createdAt: new Date(Date.now() - 6 * 3600000),
    },
    {
      id: "log-seed-202",
      invoiceId: "inv-seed-008",
      eventType: "ESCALATION_DISPATCHED",
      reasoning:
        "Guardrail escalateOnDispute=true triggered. Escalated to Owner Approvals Queue immediately without automated settlement offers.",
      inputPayload: { disputeReason: "Deliverables incomplete" },
      outputPayload: { approvalTicketId: "approval-002" },
      executionTimeMs: 55,
      createdAt: new Date(Date.now() - 6 * 3600000),
    },

    // Logs for inv-seed-007 (Partially Paid)
    {
      id: "log-seed-301",
      invoiceId: "inv-seed-007",
      eventType: "PAYMENT_PLAN_ESTABLISHED",
      reasoning:
        "Installment plan accepted by Vanguard Logistics: $600 deposit followed by 2 x $700 installments.",
      inputPayload: { totalCents: 200000, depositCents: 60000, instalments: 3 },
      outputPayload: { planId: "plan-seed-007", status: "ACTIVE" },
      executionTimeMs: 110,
      createdAt: new Date(Date.now() - 11 * 86400000),
    },
    {
      id: "log-seed-302",
      invoiceId: "inv-seed-007",
      eventType: "PAYPAL_PAYMENT_RECEIVED",
      reasoning:
        "PayPal webhook INVOICING.INVOICE.PAID received for $600.00 deposit installment. Recorded in database; updated balance to $1,400.00.",
      inputPayload: { paidAmountCents: 60000, currency: "USD" },
      outputPayload: {
        amountPaidCents: 60000,
        status: "PARTIALLY_PAID",
        nextDue: formatOffsetDate(18),
      },
      executionTimeMs: 290,
      createdAt: new Date(Date.now() - 10 * 86400000),
    },
  ];

  for (const log of logsToInsert) {
    await db
      .insert(agentLogs)
      .values({ ...log, ownerId: "owner-legacy" })
      .onConflictDoUpdate({
        target: agentLogs.id,
        set: {
          reasoning: log.reasoning,
          inputPayload: log.inputPayload,
          outputPayload: log.outputPayload,
          ownerId: "owner-legacy",
        },
      });
  }

  console.log("✅ Seeding completed successfully!");
  console.log("   - Guardrails configured (Min Deposit 30%, Max Duration 60d, Threshold $500)");
  console.log("   - 5 Clients seeded with payment history");
  console.log("   - 10 Invoices seeded with computed risk scores (OPEN, OVERDUE, IN_NEGOTIATION, PARTIALLY_PAID, PAID, DISPUTED, CANCELLED)");
  console.log("   - Payment plans & instalments seeded");
  console.log("   - 3 Approval queue tickets seeded (2 pending, 1 approved)");
  console.log("   - Agent logs audit trail seeded");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
