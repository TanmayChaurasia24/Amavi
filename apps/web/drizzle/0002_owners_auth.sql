CREATE TYPE "public"."tone" AS ENUM('friendly', 'neutral', 'firm');--> statement-breakpoint
CREATE TABLE "owners" (
	"id" text PRIMARY KEY NOT NULL,
	"paypal_payer_id" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"notification_email" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"tone" "tone" DEFAULT 'friendly' NOT NULL,
	"business_note" text,
	"consent_accepted_at" timestamp with time zone,
	"consent_version" text,
	"onboarding_step" integer DEFAULT 0 NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owners_paypal_payer_id_unique" UNIQUE("paypal_payer_id")
);
--> statement-breakpoint
ALTER TABLE "guardrails" ADD COLUMN "max_instalments" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "guardrails" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "agent_logs" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "guardrails" ADD CONSTRAINT "guardrails_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guardrails_owner_id_idx" ON "guardrails" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "clients_owner_id_idx" ON "clients" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "invoices_owner_id_idx" ON "invoices" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "approval_queue_owner_id_idx" ON "approval_queue" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "agent_logs_owner_id_idx" ON "agent_logs" USING btree ("owner_id");--> statement-breakpoint
INSERT INTO "owners" ("id", "paypal_payer_id", "email", "email_verified", "name", "display_name", "notification_email", "timezone", "tone", "onboarding_step", "onboarding_completed_at", "is_demo", "created_at", "last_login_at")
VALUES ('owner-legacy', 'legacy', 'legacy@settle.local', true, 'Legacy Owner', 'Legacy Owner', 'legacy@settle.local', 'UTC', 'friendly', 3, now(), false, now(), now())
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "owners" ("id", "paypal_payer_id", "email", "email_verified", "name", "display_name", "notification_email", "timezone", "tone", "onboarding_step", "onboarding_completed_at", "is_demo", "created_at", "last_login_at")
VALUES ('owner-demo', 'demo', 'demo@settle.local', true, 'Demo Owner', 'Freelance Designer', 'demo@settle.local', 'America/New_York', 'friendly', 3, now(), true, now(), now())
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "guardrails" ("id", "owner_id", "min_deposit_pct", "max_plan_duration_days", "max_instalments", "max_discount_pct", "allow_discounts", "auto_approve_threshold_cents", "escalate_on_dispute", "escalate_on_hardship", "updated_at")
VALUES ('owner-demo-guardrails', 'owner-demo', 30, 60, 3, 0, false, 50000, true, true, now())
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
UPDATE "clients" SET "owner_id" = 'owner-legacy' WHERE "owner_id" IS NULL;--> statement-breakpoint
UPDATE "invoices" SET "owner_id" = 'owner-legacy' WHERE "owner_id" IS NULL;--> statement-breakpoint
UPDATE "approval_queue" SET "owner_id" = 'owner-legacy' WHERE "owner_id" IS NULL;--> statement-breakpoint
UPDATE "agent_logs" SET "owner_id" = 'owner-legacy' WHERE "owner_id" IS NULL;--> statement-breakpoint
UPDATE "guardrails" SET "owner_id" = 'owner-legacy' WHERE "id" = 'default' AND "owner_id" IS NULL;

