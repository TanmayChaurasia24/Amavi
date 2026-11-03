CREATE TYPE "public"."invoice_status" AS ENUM('OPEN', 'OVERDUE', 'IN_NEGOTIATION', 'PARTIALLY_PAID', 'PAID', 'DISPUTED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"past_late_count" integer DEFAULT 0 NOT NULL,
	"avg_days_late" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"paypal_invoice_id" text NOT NULL,
	"client_id" text,
	"total_cents" integer NOT NULL,
	"amount_paid_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"due_date" text,
	"status" "invoice_status" DEFAULT 'OPEN' NOT NULL,
	"risk_score" integer,
	"paypal_status" text,
	"recipient_view_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"paypal_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"resource_id" text,
	"payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_paypal_invoice_id_idx" ON "invoices" USING btree ("paypal_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_paypal_event_id_idx" ON "webhook_events" USING btree ("paypal_event_id");--> statement-breakpoint
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events" USING btree ("event_type");