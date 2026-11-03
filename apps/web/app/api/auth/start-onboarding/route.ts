import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { owners, guardrails } from "@/db/schema";
import { createSession } from "@/lib/session-server";
import { DEFAULT_GUARDRAILS, normalizeGuardrails } from "@/lib/guardrails";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const testOwnerId = "owner-fresh-onboarding";
    const testPayerId = "PAYPAL-TEST-ONBOARD-001";

    // 1. Ensure or reset test onboarding user in DB
    const existing = await db.query.owners.findFirst({
      where: eq(owners.id, testOwnerId),
    });

    if (!existing) {
      await db.insert(owners).values({
        id: testOwnerId,
        paypalPayerId: testPayerId,
        email: "alex.freelancer@example.com",
        emailVerified: true,
        name: "Alex Morgan",
        displayName: "Alex Morgan",
        notificationEmail: "alex.freelancer@example.com",
        timezone: "America/New_York",
        tone: "friendly",
        onboardingStep: 0,
        onboardingCompletedAt: null,
        isDemo: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      });
    } else {
      // Reset onboarding step and completion so user can test the onboarding wizard again
      await db
        .update(owners)
        .set({
          onboardingStep: 0,
          onboardingCompletedAt: null,
          lastLoginAt: new Date(),
        })
        .where(eq(owners.id, testOwnerId));
    }

    // 2. Ensure initial default guardrails for this owner
    const existingGuardrails = await db.query.guardrails.findFirst({
      where: eq(guardrails.ownerId, testOwnerId),
    });

    if (!existingGuardrails) {
      const defaults = normalizeGuardrails(DEFAULT_GUARDRAILS);
      await db.insert(guardrails).values({
        id: `guardrails-${testOwnerId}`,
        ownerId: testOwnerId,
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
    }

    // 3. Create session cookie
    await createSession({
      ownerId: testOwnerId,
      isDemo: false,
      onboardingCompleted: false,
    });

    return NextResponse.json({
      success: true,
      redirect: "/onboarding",
    });
  } catch (error) {
    console.error("[start-onboarding] Error initializing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to initialize onboarding" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Allow GET redirect as well for direct link clicks
  const res = await POST(req);
  if (res.ok) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

