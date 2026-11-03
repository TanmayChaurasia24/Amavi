ALTER TABLE "owners" ALTER COLUMN "paypal_payer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "owners" ADD COLUMN IF NOT EXISTS "password_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "owners_email_idx" ON "owners" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "owners_paypal_payer_id_idx" ON "owners" USING btree ("paypal_payer_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_owner_id_owners_id_fk";--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_owner_id_idx" ON "refresh_tokens" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");

