CREATE TYPE "public"."approval_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."instalment_status" AS ENUM('PENDING', 'PAID', 'OVERDUE');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('INBOUND', 'OUTBOUND');--> statement-breakpoint
CREATE TYPE "public"."message_intent" AS ENUM('PROMISE_TO_PAY', 'REQUEST_INSTALMENT', 'DISPUTE', 'HARDSHIP', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."plan_frequency" AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'DEFAULTED');--> statement-breakpoint
CREATE TABLE "agent_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text,
	"event_type" text NOT NULL,
	"input_payload" jsonb,
	"output_payload" jsonb,
	"reasoning" text NOT NULL,
	"execution_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"client_id" text,
	"proposal_summary" text NOT NULL,
	"reason" text NOT NULL,
	"status" "approval_status" DEFAULT 'PENDING' NOT NULL,
	"action_payload" jsonb,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardrails" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"min_deposit_pct" integer DEFAULT 30 NOT NULL,
	"max_plan_duration_days" integer DEFAULT 60 NOT NULL,
	"max_discount_pct" integer DEFAULT 0 NOT NULL,
	"allow_discounts" boolean DEFAULT false NOT NULL,
	"auto_approve_threshold_cents" integer DEFAULT 50000 NOT NULL,
	"escalate_on_dispute" boolean DEFAULT true NOT NULL,
	"escalate_on_hardship" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"direction" "message_direction" DEFAULT 'INBOUND' NOT NULL,
	"sender" text NOT NULL,
	"content" text NOT NULL,
	"intent" "message_intent",
	"proposal" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"client_id" text,
	"total_cents" integer NOT NULL,
	"deposit_cents" integer NOT NULL,
	"instalment_count" integer NOT NULL,
	"frequency" "plan_frequency" DEFAULT 'MONTHLY' NOT NULL,
	"status" "plan_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_instalments" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"instalment_number" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"due_date" text NOT NULL,
	"paypal_invoice_id" text,
	"status" "instalment_status" DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_instalments" ADD CONSTRAINT "plan_instalments_plan_id_payment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."payment_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_logs_invoice_id_idx" ON "agent_logs" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "agent_logs_event_type_idx" ON "agent_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "agent_logs_created_at_idx" ON "agent_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "approval_queue_invoice_id_idx" ON "approval_queue" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "approval_queue_status_idx" ON "approval_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_invoice_id_idx" ON "messages" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payment_plans_invoice_id_idx" ON "payment_plans" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payment_plans_client_id_idx" ON "payment_plans" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "plan_instalments_plan_id_idx" ON "plan_instalments" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "invoices_client_id_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");