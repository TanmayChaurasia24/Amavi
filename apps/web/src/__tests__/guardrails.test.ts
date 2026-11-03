import { describe, it, expect } from "vitest";
import {
  guardrailsSchema,
  DEFAULT_GUARDRAILS,
  normalizeGuardrails,
  describeGuardrails,
  profileSchema,
  CONSENT_VERSION,
  CONSENT_TEXT,
} from "../lib/guardrails";

describe("guardrailsSchema", () => {
  it("accepts valid default guardrails", () => {
    const result = guardrailsSchema.safeParse(DEFAULT_GUARDRAILS);
    expect(result.success).toBe(true);
  });

  it("rejects minDepositPct below 10", () => {
    const result = guardrailsSchema.safeParse({
      ...DEFAULT_GUARDRAILS,
      minDepositPct: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects minDepositPct above 70", () => {
    const result = guardrailsSchema.safeParse({
      ...DEFAULT_GUARDRAILS,
      minDepositPct: 80,
    });
    expect(result.success).toBe(false);
  });

  it("rejects maxPlanDays below 14", () => {
    const result = guardrailsSchema.safeParse({
      ...DEFAULT_GUARDRAILS,
      maxPlanDays: 7,
    });
    expect(result.success).toBe(false);
  });

  it("rejects maxPlanDays above 180", () => {
    const result = guardrailsSchema.safeParse({
      ...DEFAULT_GUARDRAILS,
      maxPlanDays: 365,
    });
    expect(result.success).toBe(false);
  });

  it("rejects maxInstalments below 1", () => {
    const result = guardrailsSchema.safeParse({
      ...DEFAULT_GUARDRAILS,
      maxInstalments: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects maxInstalments above 6", () => {
    const result = guardrailsSchema.safeParse({
      ...DEFAULT_GUARDRAILS,
      maxInstalments: 7,
    });
    expect(result.success).toBe(false);
  });

  it("rejects maxDiscountPct above 25", () => {
    const result = guardrailsSchema.safeParse({
      ...DEFAULT_GUARDRAILS,
      maxDiscountPct: 30,
    });
    expect(result.success).toBe(false);
  });

  it("forces escalateDisputes to true even when false is provided", () => {
    const result = guardrailsSchema.safeParse({
      ...DEFAULT_GUARDRAILS,
      escalateDisputes: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.escalateDisputes).toBe(true);
    }
  });

  it("forces escalateHardship to true even when false is provided", () => {
    const result = guardrailsSchema.safeParse({
      ...DEFAULT_GUARDRAILS,
      escalateHardship: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.escalateHardship).toBe(true);
    }
  });
});

describe("normalizeGuardrails", () => {
  it("forces both locked toggles to true", () => {
    const result = normalizeGuardrails({
      ...DEFAULT_GUARDRAILS,
      escalateDisputes: false as any,
      escalateHardship: false as any,
    });
    expect(result.escalateDisputes).toBe(true);
    expect(result.escalateHardship).toBe(true);
  });

  it("returns valid guardrails for defaults", () => {
    const result = normalizeGuardrails(DEFAULT_GUARDRAILS);
    expect(result.minDepositPct).toBe(30);
    expect(result.maxPlanDays).toBe(60);
    expect(result.maxInstalments).toBe(3);
  });
});

describe("describeGuardrails", () => {
  it("produces a non-empty summary string", () => {
    const desc = describeGuardrails(DEFAULT_GUARDRAILS);
    expect(typeof desc).toBe("string");
    expect(desc.length).toBeGreaterThan(20);
  });

  it("mentions the instalment count", () => {
    const desc = describeGuardrails({ ...DEFAULT_GUARDRAILS, maxInstalments: 4 });
    expect(desc).toContain("4");
  });

  it("mentions max plan days", () => {
    const desc = describeGuardrails(DEFAULT_GUARDRAILS);
    expect(desc).toContain("60 days");
  });

  it("mentions 'no discounts' when discounts are off", () => {
    const desc = describeGuardrails({ ...DEFAULT_GUARDRAILS, allowDiscounts: false });
    expect(desc).toContain("no discounts");
  });

  it("mentions discount % when discounts are on", () => {
    const desc = describeGuardrails({
      ...DEFAULT_GUARDRAILS,
      allowDiscounts: true,
      maxDiscountPct: 10,
    });
    expect(desc).toContain("10%");
  });

  it("mentions the approval threshold in dollars", () => {
    const desc = describeGuardrails(DEFAULT_GUARDRAILS);
    expect(desc).toContain("$500");
  });

  it("mentions disputes and hardship escalation", () => {
    const desc = describeGuardrails(DEFAULT_GUARDRAILS);
    expect(desc.toLowerCase()).toContain("disputes");
    expect(desc.toLowerCase()).toContain("hardship");
  });
});

describe("profileSchema", () => {
  it("accepts valid profile", () => {
    const result = profileSchema.safeParse({
      displayName: "Jane Freelancer",
      notificationEmail: "jane@example.com",
      timezone: "America/New_York",
      tone: "friendly",
      businessNote: "I do web design",
    });
    expect(result.success).toBe(true);
  });

  it("rejects displayName > 60 chars", () => {
    const result = profileSchema.safeParse({
      displayName: "A".repeat(61),
      notificationEmail: "jane@example.com",
      timezone: "UTC",
      tone: "neutral",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = profileSchema.safeParse({
      displayName: "Jane",
      notificationEmail: "not-an-email",
      timezone: "UTC",
      tone: "firm",
    });
    expect(result.success).toBe(false);
  });

  it("rejects businessNote > 300 chars", () => {
    const result = profileSchema.safeParse({
      displayName: "Jane",
      notificationEmail: "jane@example.com",
      timezone: "UTC",
      tone: "neutral",
      businessNote: "A".repeat(301),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid tone values", () => {
    const result = profileSchema.safeParse({
      displayName: "Jane",
      notificationEmail: "jane@example.com",
      timezone: "UTC",
      tone: "aggressive",
    });
    expect(result.success).toBe(false);
  });
});

describe("Consent constants", () => {
  it("has valid version and text", () => {
    expect(typeof CONSENT_VERSION).toBe("string");
    expect(CONSENT_VERSION.length).toBeGreaterThan(0);
    expect(typeof CONSENT_TEXT).toBe("string");
    expect(CONSENT_TEXT).toContain("PayPal Sandbox");
  });
});

