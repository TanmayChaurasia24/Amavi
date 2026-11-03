import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "../lib/session";

describe("Session JWT helpers", () => {
  it("signs and verifies a valid session payload", async () => {
    const payload = { ownerId: "test-owner-123", isDemo: false };
    const token = await signSession(payload);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const verified = await verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.ownerId).toBe("test-owner-123");
    expect(verified?.isDemo).toBe(false);
  });

  it("handles demo session flags", async () => {
    const payload = { ownerId: "owner-demo", isDemo: true };
    const token = await signSession(payload);
    const verified = await verifySession(token);
    expect(verified?.ownerId).toBe("owner-demo");
    expect(verified?.isDemo).toBe(true);
  });

  it("handles onboardingCompleted flag", async () => {
    const payload = {
      ownerId: "owner-new",
      isDemo: false,
      onboardingCompleted: true,
    };
    const token = await signSession(payload);
    const verified = await verifySession(token);
    expect(verified?.ownerId).toBe("owner-new");
    expect(verified?.onboardingCompleted).toBe(true);
  });

  it("returns null for malformed tokens", async () => {
    const verified = await verifySession("invalid.token.string");
    expect(verified).toBeNull();
  });

  it("returns null for empty tokens", async () => {
    const verified = await verifySession("");
    expect(verified).toBeNull();
  });
});

