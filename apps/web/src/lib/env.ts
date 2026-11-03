import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PAYPAL_CLIENT_ID: z.string().min(1, "PAYPAL_CLIENT_ID is required"),
  PAYPAL_CLIENT_SECRET: z.string().min(1, "PAYPAL_CLIENT_SECRET is required"),
  PAYPAL_ENVIRONMENT: z
    .enum(["SANDBOX", "LIVE"])
    .default("SANDBOX")
    .refine((v) => v === "SANDBOX", {
      message:
        "PAYPAL_ENVIRONMENT must be 'SANDBOX'. This app is SANDBOX-ONLY. Hard fail.",
    }),
  PAYPAL_WEBHOOK_ID: z.string().min(1, "PAYPAL_WEBHOOK_ID is required"),
  PAYPAL_WEBHOOK_VERIFY: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v !== "false"),
  ANTHROPIC_API_KEY: z.string().optional(),
  APP_BASE_URL: z.string().url("APP_BASE_URL must be a valid URL"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // ─── Auth (Task 3) ───────────────────────────────────────────────────────────
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters")
    .optional(),
  PAYPAL_LOGIN_REDIRECT_URI: z
    .string()
    .url("PAYPAL_LOGIN_REDIRECT_URI must be a valid URL")
    .optional(),
  // ─── Email Channel (Resend) ─────────────────────────────────────────────────
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  INBOUND_EMAIL_DOMAIN: z
    .string()
    .optional()
    .default("inbound.settle.app"),
  EMAIL_FROM: z
    .string()
    .optional()
    .default("Settle Collections <notifications@settle.app>"),
  EMAIL_CHANNEL_ENABLED: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true"),
  MAX_AGENT_REPLIES_PER_INVOICE_PER_DAY: z
    .coerce
    .number()
    .int()
    .positive()
    .default(5),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `  • ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(
      `❌ Invalid environment variables:\n${errors}\n\nSee .env.example for the full list of required variables.`
    );
  }
  return result.data;
}

export const env = parseEnv();

export const PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com";
