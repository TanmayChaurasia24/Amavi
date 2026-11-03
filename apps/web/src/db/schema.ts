import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Tone Enum ────────────────────────────────────────────────────────────────
export const toneEnum = pgEnum("tone", ["friendly", "neutral", "firm"]);

// ─── Owners ───────────────────────────────────────────────────────────────────
export const owners = pgTable(
  "owners",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    paypalPayerId: text("paypal_payer_id").unique(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    emailVerified: boolean("email_verified").notNull().default(false),
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    notificationEmail: text("notification_email").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    tone: toneEnum("tone").notNull().default("friendly"),
    businessNote: text("business_note"),
    consentAcceptedAt: timestamp("consent_accepted_at", { withTimezone: true }),
    consentVersion: text("consent_version"),
    onboardingStep: integer("onboarding_step").notNull().default(0),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("owners_email_idx").on(table.email),
    uniqueIndex("owners_paypal_payer_id_idx").on(table.paypalPayerId),
  ]
);

// ─── Enums ────────────────────────────────────────────────────────────────────
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "OPEN",
  "OVERDUE",
  "IN_NEGOTIATION",
  "PARTIALLY_PAID",
  "PAID",
  "DISPUTED",
  "CANCELLED",
]);

export const messageDirectionEnum = pgEnum("message_direction", [
  "INBOUND",
  "OUTBOUND",
]);

export const messageIntentEnum = pgEnum("message_intent", [
  "PROMISE_TO_PAY",
  "REQUEST_INSTALMENT",
  "DISPUTE",
  "HARDSHIP",
  "OTHER",
]);

export const planFrequencyEnum = pgEnum("plan_frequency", [
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
]);

export const planStatusEnum = pgEnum("plan_status", [
  "PENDING",
  "ACTIVE",
  "COMPLETED",
  "DEFAULTED",
]);

export const instalmentStatusEnum = pgEnum("instalment_status", [
  "PENDING",
  "PAID",
  "OVERDUE",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

// ─── Clients ──────────────────────────────────────────────────────────────────
export const clients = pgTable("clients", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull(),
  pastLateCount: integer("past_late_count").notNull().default(0),
  avgDaysLate: integer("avg_days_late").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ownerId: text("owner_id").references(() => owners.id, { onDelete: "cascade" }),
});

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoices = pgTable(
  "invoices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    paypalInvoiceId: text("paypal_invoice_id").notNull(),
    clientId: text("client_id").references(() => clients.id),
    totalCents: integer("total_cents").notNull(),
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    dueDate: text("due_date"), // ISO date string YYYY-MM-DD
    status: invoiceStatusEnum("status").notNull().default("OPEN"),
    riskScore: integer("risk_score"), // 0-100 computed risk score
    paypalStatus: text("paypal_status"), // raw PayPal status string
    recipientViewUrl: text("recipient_view_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ownerId: text("owner_id").references(() => owners.id, { onDelete: "cascade" }),
    replyToken: text("reply_token").unique().$defaultFn(() => crypto.randomUUID().replace(/-/g, "")),
  },
  (table) => [
    uniqueIndex("invoices_paypal_invoice_id_idx").on(table.paypalInvoiceId),
    uniqueIndex("invoices_reply_token_idx").on(table.replyToken),
    index("invoices_client_id_idx").on(table.clientId),
    index("invoices_status_idx").on(table.status),
  ]
);

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = pgTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    direction: messageDirectionEnum("direction").notNull().default("INBOUND"),
    sender: text("sender").notNull(), // Client email/name, "AI Agent", or "Owner"
    content: text("content").notNull(),
    intent: messageIntentEnum("intent"),
    proposal: jsonb("proposal"), // parsed installment proposal or pay promise
    channel: text("channel").notNull().default("inbox"), // 'inbox' | 'email'
    externalId: text("external_id"),
    emailMessageId: text("email_message_id"),
    inReplyTo: text("in_reply_to"),
    ignoredReason: text("ignored_reason"),
    deliveryStatus: text("delivery_status").notNull().default("delivered"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_invoice_id_idx").on(table.invoiceId),
    index("messages_channel_idx").on(table.channel),
    uniqueIndex("messages_external_id_idx").on(table.externalId),
  ]
);

// ─── Payment Plans ────────────────────────────────────────────────────────────
export const paymentPlans = pgTable(
  "payment_plans",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    clientId: text("client_id").references(() => clients.id),
    totalCents: integer("total_cents").notNull(),
    depositCents: integer("deposit_cents").notNull(),
    instalmentCount: integer("instalment_count").notNull(),
    frequency: planFrequencyEnum("frequency").notNull().default("MONTHLY"),
    status: planStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payment_plans_invoice_id_idx").on(table.invoiceId),
    index("payment_plans_client_id_idx").on(table.clientId),
  ]
);

// ─── Plan Instalments ─────────────────────────────────────────────────────────
export const planInstalments = pgTable(
  "plan_instalments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    planId: text("plan_id")
      .notNull()
      .references(() => paymentPlans.id, { onDelete: "cascade" }),
    instalmentNumber: integer("instalment_number").notNull(),
    amountCents: integer("amount_cents").notNull(),
    dueDate: text("due_date").notNull(), // YYYY-MM-DD
    paypalInvoiceId: text("paypal_invoice_id"),
    status: instalmentStatusEnum("status").notNull().default("PENDING"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [index("plan_instalments_plan_id_idx").on(table.planId)]
);

// ─── Guardrails ───────────────────────────────────────────────────────────────
export const guardrails = pgTable(
  "guardrails",
  {
    id: text("id").primaryKey().default("default"),
    minDepositPct: integer("min_deposit_pct").notNull().default(30), // e.g. 30% min deposit
    maxPlanDurationDays: integer("max_plan_duration_days").notNull().default(60), // e.g. 60 days
    maxDiscountPct: integer("max_discount_pct").notNull().default(0), // max discount if allowed
    allowDiscounts: boolean("allow_discounts").notNull().default(false),
    autoApproveThresholdCents: integer("auto_approve_threshold_cents")
      .notNull()
      .default(50000), // $500.00
    escalateOnDispute: boolean("escalate_on_dispute").notNull().default(true),
    escalateOnHardship: boolean("escalate_on_hardship").notNull().default(true),
    maxInstalments: integer("max_instalments").notNull().default(3),
    ownerId: text("owner_id").references(() => owners.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("guardrails_owner_id_idx").on(table.ownerId),
  ]
);

// ─── Approval Queue ───────────────────────────────────────────────────────────
export const approvalQueue = pgTable(
  "approval_queue",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    clientId: text("client_id").references(() => clients.id),
    proposalSummary: text("proposal_summary").notNull(),
    reason: text("reason").notNull(),
    status: approvalStatusEnum("status").notNull().default("PENDING"),
    actionPayload: jsonb("action_payload"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ownerId: text("owner_id").references(() => owners.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("approval_queue_invoice_id_idx").on(table.invoiceId),
    index("approval_queue_status_idx").on(table.status),
  ]
);

// ─── Agent Logs (Audit Trail) ─────────────────────────────────────────────────
export const agentLogs = pgTable(
  "agent_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    inputPayload: jsonb("input_payload"),
    outputPayload: jsonb("output_payload"),
    reasoning: text("reasoning").notNull(),
    executionTimeMs: integer("execution_time_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ownerId: text("owner_id").references(() => owners.id, { onDelete: "set null" }),
  },
  (table) => [
    index("agent_logs_invoice_id_idx").on(table.invoiceId),
    index("agent_logs_event_type_idx").on(table.eventType),
    index("agent_logs_created_at_idx").on(table.createdAt),
  ]
);

// ─── WebhookEvents ────────────────────────────────────────────────────────────
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    paypalEventId: text("paypal_event_id").notNull(),
    eventType: text("event_type").notNull(),
    resourceId: text("resource_id"),
    payload: jsonb("payload"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
  },
  (table) => [
    uniqueIndex("webhook_events_paypal_event_id_idx").on(table.paypalEventId),
    index("webhook_events_event_type_idx").on(table.eventType),
  ]
);

// ─── Refresh Tokens ───────────────────────────────────────────────────────────
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: text("owner_id")
      .notNull()
      .references(() => owners.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("refresh_tokens_owner_id_idx").on(table.ownerId),
    uniqueIndex("refresh_tokens_token_hash_idx").on(table.tokenHash),
  ]
);

// ─── Drizzle Relations ────────────────────────────────────────────────────────
export const ownersRelations = relations(owners, ({ many }) => ({
  guardrails: many(guardrails),
  clients: many(clients),
  invoices: many(invoices),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  owner: one(owners, {
    fields: [refreshTokens.ownerId],
    references: [owners.id],
  }),
}));

export const guardrailsRelations = relations(guardrails, ({ one }) => ({
  owner: one(owners, { fields: [guardrails.ownerId], references: [owners.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  invoices: many(invoices),
  paymentPlans: many(paymentPlans),
  approvalQueue: many(approvalQueue),
  owner: one(owners, { fields: [clients.ownerId], references: [owners.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  messages: many(messages),
  paymentPlans: many(paymentPlans),
  approvalQueue: many(approvalQueue),
  agentLogs: many(agentLogs),
  owner: one(owners, { fields: [invoices.ownerId], references: [owners.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  invoice: one(invoices, {
    fields: [messages.invoiceId],
    references: [invoices.id],
  }),
}));

export const paymentPlansRelations = relations(paymentPlans, ({ one, many }) => ({
  invoice: one(invoices, {
    fields: [paymentPlans.invoiceId],
    references: [invoices.id],
  }),
  client: one(clients, {
    fields: [paymentPlans.clientId],
    references: [clients.id],
  }),
  instalments: many(planInstalments),
}));

export const planInstalmentsRelations = relations(planInstalments, ({ one }) => ({
  plan: one(paymentPlans, {
    fields: [planInstalments.planId],
    references: [paymentPlans.id],
  }),
}));

export const approvalQueueRelations = relations(approvalQueue, ({ one }) => ({
  invoice: one(invoices, {
    fields: [approvalQueue.invoiceId],
    references: [invoices.id],
  }),
  client: one(clients, {
    fields: [approvalQueue.clientId],
    references: [clients.id],
  }),
}));

export const agentLogsRelations = relations(agentLogs, ({ one }) => ({
  invoice: one(invoices, {
    fields: [agentLogs.invoiceId],
    references: [invoices.id],
  }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────
export type Owner = typeof owners.$inferSelect;
export type NewOwner = typeof owners.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type PaymentPlan = typeof paymentPlans.$inferSelect;
export type NewPaymentPlan = typeof paymentPlans.$inferInsert;
export type PlanInstalment = typeof planInstalments.$inferSelect;
export type NewPlanInstalment = typeof planInstalments.$inferInsert;
export type Guardrail = typeof guardrails.$inferSelect;
export type NewGuardrail = typeof guardrails.$inferInsert;
export type ApprovalQueueItem = typeof approvalQueue.$inferSelect;
export type NewApprovalQueueItem = typeof approvalQueue.$inferInsert;
export type AgentLog = typeof agentLogs.$inferSelect;
export type NewAgentLog = typeof agentLogs.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];

