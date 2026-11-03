import crypto from "crypto";
import { z } from "zod";

// ─── Password Hashing & Verification (scrypt + timingSafeEqual) ───────────────

/**
 * Hashes a plaintext password using standard Node.js crypto.scrypt with a random 16-byte salt.
 * Formats output as `${salt}:${derivedKeyHex}`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verifies a plaintext password against a stored `${salt}:${derivedKeyHex}` hash
 * using constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;

  return new Promise((resolve) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const storedBuffer = Buffer.from(key, "hex");
        if (storedBuffer.length !== derivedKey.length) return resolve(false);
        resolve(crypto.timingSafeEqual(storedBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

// ─── Input Validation Schemas ──────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name cannot exceed 60 characters"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .transform((val) => val.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
