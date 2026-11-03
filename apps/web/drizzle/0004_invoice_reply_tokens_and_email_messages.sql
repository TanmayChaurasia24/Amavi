ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "reply_token" text;--> statement-breakpoint
UPDATE "invoices" SET "reply_token" = md5(random()::text || clock_timestamp()::text) || md5(random()::text) WHERE "reply_token" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_reply_token_idx" ON "invoices" USING btree ("reply_token");--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "channel" text DEFAULT 'inbox' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "external_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "email_message_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "in_reply_to" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "ignored_reason" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "delivery_status" text DEFAULT 'delivered' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_channel_idx" ON "messages" USING btree ("channel");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "messages_external_id_idx" ON "messages" USING btree ("external_id");

