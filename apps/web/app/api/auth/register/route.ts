import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/db";
import { owners, guardrails } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, registerSchema } from "@/lib/auth/password";
import { createSession } from "@/lib/session-server";
import { DEFAULT_GUARDRAILS, normalizeGuardrails } from "@/lib/guardrails";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid registration details";
      return NextResponse.json(
        { error: firstError, details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check if account already exists
    const [existing] = await db
      .select({ id: owners.id, email: owners.email })
      .from(owners)
      .where(eq(owners.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    // Hash the password securely with scrypt + salt
    const passwordHash = await hashPassword(password);
    const newOwnerId = `owner-${crypto.randomUUID()}`;

    // Insert new owner
    const [newOwner] = await db
      .insert(owners)
      .values({
        id: newOwnerId,
        email,
        passwordHash,
        name,
        displayName: name,
        notificationEmail: email,
        emailVerified: true,
        timezone: "UTC",
        tone: "friendly",
        onboardingStep: 0,
        onboardingCompletedAt: null,
        isDemo: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      })
      .returning();

    if (!newOwner) {
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Initialize default guardrails for this owner
    const defaults = normalizeGuardrails(DEFAULT_GUARDRAILS);
    await db.insert(guardrails).values({
      id: `guardrails-${newOwnerId}`,
      ownerId: newOwnerId,
      minDepositPct: defaults.minDepositPct,
      maxPlanDurationDays: defaults.maxPlanDays,
      maxInstalments: defaults.maxInstalments,
      allowDiscounts: defaults.allowDiscounts,
      maxDiscountPct: defaults.maxDiscountPct,
      autoApproveThresholdCents: defaults.autoApproveThresholdCents,
      escalateOnDispute: true,
      escalateOnHardship: true,
      updatedAt: new Date(),
    });

    // Issue access cookie (15m) and refresh token (30d)
    await createSession({
      ownerId: newOwnerId,
      isDemo: false,
      onboardingCompleted: false,
    });

    return NextResponse.json({
      success: true,
      redirect: "/onboarding",
      owner: {
        id: newOwner.id,
        name: newOwner.name,
        email: newOwner.email,
        displayName: newOwner.displayName,
      },
    });
  } catch (error) {
    console.error("[register] Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
