import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { owners, guardrails } from "@/db/schema";
import { getSession, createSession } from "@/lib/session-server";
import { DEFAULT_GUARDRAILS, normalizeGuardrails } from "@/lib/guardrails";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    let session = await getSession();

    // Auto-create test onboarding session if none exists so users can directly load /onboarding
    if (!session) {
      const defaultTestId = "owner-fresh-onboarding";
      let owner = await db.query.owners.findFirst({
        where: eq(owners.id, defaultTestId),
      });

      if (!owner) {
        [owner] = await db
          .insert(owners)
          .values({
            id: defaultTestId,
            paypalPayerId: "PAYPAL-TEST-ONBOARD-001",
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
          })
          .returning();
      }

      await createSession({ ownerId: defaultTestId, isDemo: false });
      session = { ownerId: defaultTestId, isDemo: false };
    }

    const owner = await db.query.owners.findFirst({
      where: eq(owners.id, session.ownerId),
    });

    if (!owner) {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 });
    }

    // Fetch or initialize owner's guardrails
    let ownerGuardrails = await db.query.guardrails.findFirst({
      where: eq(guardrails.ownerId, owner.id),
    });

    if (!ownerGuardrails) {
      const defaults = normalizeGuardrails(DEFAULT_GUARDRAILS);
      const [inserted] = await db
        .insert(guardrails)
        .values({
          id: `guardrails-${owner.id}`,
          ownerId: owner.id,
          minDepositPct: defaults.minDepositPct,
          maxPlanDurationDays: defaults.maxPlanDays,
          maxInstalments: defaults.maxInstalments,
          allowDiscounts: defaults.allowDiscounts,
          maxDiscountPct: defaults.maxDiscountPct,
          autoApproveThresholdCents: defaults.autoApproveThresholdCents,
          escalateOnDispute: true,
          escalateOnHardship: true,
          updatedAt: new Date(),
        })
        .returning();
      ownerGuardrails = inserted;
    }

    if (!ownerGuardrails) {
      return NextResponse.json(
        { error: "Failed to initialize guardrails" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      owner: {
        id: owner.id,
        paypalPayerId: owner.paypalPayerId,
        name: owner.name,
        email: owner.email,
        displayName: owner.displayName,
        notificationEmail: owner.notificationEmail,
        timezone: owner.timezone,
        tone: owner.tone,
        businessNote: owner.businessNote ?? "",
        onboardingStep: owner.onboardingStep,
        onboardingCompletedAt: owner.onboardingCompletedAt,
        isDemo: owner.isDemo,
      },
      guardrails: {
        minDepositPct: ownerGuardrails.minDepositPct,
        maxPlanDays: ownerGuardrails.maxPlanDurationDays,
        maxInstalments: ownerGuardrails.maxInstalments,
        allowDiscounts: ownerGuardrails.allowDiscounts,
        maxDiscountPct: ownerGuardrails.maxDiscountPct,
        autoApproveThresholdCents: ownerGuardrails.autoApproveThresholdCents,
        escalateDisputes: true,
        escalateHardship: true,
      },
    });
  } catch (error) {
    console.error("[api/onboarding] Error loading onboarding state:", error);
    return NextResponse.json(
      { error: "Failed to load onboarding state" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/onboarding - Saves intermediate step progress
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { step, profile, guardrails: guardrailValues } = body;

    // 1. Update owner profile and step if provided
    if (profile || typeof step === "number") {
      const updateData: Record<string, unknown> = {};
      if (typeof step === "number") {
        updateData.onboardingStep = Math.max(0, Math.min(3, step));
      }
      if (profile) {
        if (profile.displayName) updateData.displayName = profile.displayName.slice(0, 60);
        if (profile.notificationEmail) updateData.notificationEmail = profile.notificationEmail;
        if (profile.timezone) updateData.timezone = profile.timezone;
        if (profile.tone) updateData.tone = profile.tone;
        if (typeof profile.businessNote === "string") {
          updateData.businessNote = profile.businessNote.slice(0, 300);
        }
      }

      await db
        .update(owners)
        .set(updateData)
        .where(eq(owners.id, session.ownerId));
    }

    // 2. Update guardrails if provided in Step 2
    if (guardrailValues) {
      const normalized = normalizeGuardrails(guardrailValues);
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
    }

    return NextResponse.json({ success: true, savedStep: step });
  } catch (error) {
    console.error("[api/onboarding] Error saving intermediate step:", error);
    return NextResponse.json(
      { error: "Failed to save step progress" },
      { status: 500 }
    );
  }
}

