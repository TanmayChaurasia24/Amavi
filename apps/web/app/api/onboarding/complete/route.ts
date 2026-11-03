import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { owners, guardrails } from "@/db/schema";
import { getSession, createSession } from "@/lib/session-server";
import {
  onboardingCompleteSchema,
  normalizeGuardrails,
  CONSENT_VERSION,
} from "@/lib/guardrails";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = onboardingCompleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { profile, guardrails: guardrailInput } = parsed.data;
    const normalized = normalizeGuardrails(guardrailInput);

    // 1. Update owner profile, consent, and onboarding status
    await db
      .update(owners)
      .set({
        displayName: profile.displayName,
        notificationEmail: profile.notificationEmail,
        timezone: profile.timezone,
        tone: profile.tone,
        businessNote: profile.businessNote || null,
        consentAcceptedAt: new Date(),
        consentVersion: CONSENT_VERSION,
        onboardingStep: 3,
        onboardingCompletedAt: new Date(),
        lastLoginAt: new Date(),
      })
      .where(eq(owners.id, session.ownerId));

    // 2. Persist normalized guardrails
    await db
      .insert(guardrails)
      .values({
        id: `guardrails-${session.ownerId}`,
        ownerId: session.ownerId,
        minDepositPct: normalized.minDepositPct,
        maxPlanDurationDays: normalized.maxPlanDays,
        maxInstalments: normalized.maxInstalments,
        allowDiscounts: normalized.allowDiscounts,
        maxDiscountPct: normalized.maxDiscountPct,
        autoApproveThresholdCents: normalized.autoApproveThresholdCents,
        escalateOnDispute: true,
        escalateOnHardship: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: guardrails.id,
        set: {
          minDepositPct: normalized.minDepositPct,
          maxPlanDurationDays: normalized.maxPlanDays,
          maxInstalments: normalized.maxInstalments,
          allowDiscounts: normalized.allowDiscounts,
          maxDiscountPct: normalized.maxDiscountPct,
          autoApproveThresholdCents: normalized.autoApproveThresholdCents,
          escalateOnDispute: true,
          escalateOnHardship: true,
          updatedAt: new Date(),
        },
      });

    // 3. Re-issue session with onboardingCompleted = true
    await createSession({
      ownerId: session.ownerId,
      isDemo: session.isDemo,
      onboardingCompleted: true,
    });

    return NextResponse.json({
      success: true,
      redirect: "/dashboard?welcome=true",
    });
  } catch (error) {
    console.error("[api/onboarding/complete] Error finalizing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to finalize onboarding setup" },
      { status: 500 }
    );
  }
}

