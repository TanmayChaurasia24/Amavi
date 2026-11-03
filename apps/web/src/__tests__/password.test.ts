import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  registerSchema,
  loginSchema,
} from "../lib/auth/password";

describe("Password Hashing & Verification (scrypt)", () => {
  it("hashes password with a random salt", async () => {
    const raw = "superSecret123!";
    const hash = await hashPassword(raw);

    expect(typeof hash).toBe("string");
    expect(hash.includes(":")).toBe(true);

    const [salt, key] = hash.split(":");
    expect(salt?.length).toBe(32); // 16 bytes hex = 32 chars
    expect(key?.length).toBe(128); // 64 bytes hex = 128 chars
  });

  it("produces different hashes for the same password due to salting", async () => {
    const raw = "samePasswordEverytime";
    const hash1 = await hashPassword(raw);
    const hash2 = await hashPassword(raw);

    expect(hash1).not.toBe(hash2);
  });

  it("verifies correct password against hash", async () => {
    const password = "mySecureFreelancePassword!2026";
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("rejects incorrect password", async () => {
    const hash = await hashPassword("correctPassword");

    const isValid = await verifyPassword("wrongPassword", hash);
    expect(isValid).toBe(false);
  });

  it("returns false for malformed or empty hashes without throwing", async () => {
    expect(await verifyPassword("password", "")).toBe(false);
    expect(await verifyPassword("password", "no-colon-hash")).toBe(false);
    expect(await verifyPassword("password", "salt:invalidhex")).toBe(false);
  });
});

describe("Registration & Login Schemas", () => {
  it("validates and normalizes valid registration input", () => {
    const input = {
      name: "  Sarah Connor  ",
      email: "  Sarah@TechFreelance.IO ",
      password: "strongPassword88",
    };

    const result = registerSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Sarah Connor");
      expect(result.data.email).toBe("sarah@techfreelance.io");
      expect(result.data.password).toBe("strongPassword88");
    }
  });

  it("rejects passwords shorter than 8 characters", () => {
    const input = {
      name: "Bob Builder",
      email: "bob@builder.com",
      password: "short",
    };

    const result = registerSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid email formats", () => {
    const input = {
      name: "Bob Builder",
      email: "not-an-email",
      password: "validPassword123",
    };

    const result = registerSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("validates and normalizes login schema", () => {
    const input = {
      email: "  Alice@Company.com  ",
      password: "anyPassword",
    };

    const result = loginSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("alice@company.com");
      expect(result.data.password).toBe("anyPassword");
    }
  });

  it("rejects empty password on login", () => {
    const input = {
      email: "alice@company.com",
      password: "",
    };

    const result = loginSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
