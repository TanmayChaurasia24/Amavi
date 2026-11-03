import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { guardrails } from "@/db/schema";
import { getSession } from "@/lib/session-server";
import {
  guardrailsSchema,
  normalizeGuardrails,
  DEFAULT_GUARDRAILS,
} from "@/lib/guardrails";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    const ownerId = session?.ownerId;

    let current = null;
    if (ownerId) {
      current = await db.query.guardrails.findFirst({
        where: eq(guardrails.ownerId, ownerId),
      });
    }

    if (!current) {
      current = await db.query.guardrails.findFirst({
        where: eq(guardrails.id, "default"),
      });
    }

    if (!current) {
      const defaults = normalizeGuardrails(DEFAULT_GUARDRAILS);
      const [inserted] = await db
        .insert(guardrails)
        .values({
          id: ownerId ? `guardrails-${ownerId}` : "default",
          ownerId: ownerId ?? null,
          minDepositPct: defaults.minDepositPct,
          maxPlanDurationDays: defaults.maxPlanDays,
          maxInstalments: defaults.maxInstalments,
          maxDiscountPct: defaults.maxDiscountPct,
          allowDiscounts: defaults.allowDiscounts,
          autoApproveThresholdCents: defaults.autoApproveThresholdCents,
          escalateOnDispute: true,
          escalateOnHardship: true,
          updatedAt: new Date(),
        })
        .returning();
      current = inserted;
    }

    if (!current) {
      return NextResponse.json(
        { error: "Failed to load guardrails" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      guardrails: {
        id: current.id,
        ownerId: current.ownerId,
        minDepositPct: current.minDepositPct,
        maxPlanDurationDays: current.maxPlanDurationDays,
        maxPlanDays: current.maxPlanDurationDays,
        maxInstalments: current.maxInstalments,
        maxDiscountPct: current.maxDiscountPct,
        allowDiscounts: current.allowDiscounts,
        autoApproveThresholdCents: current.autoApproveThresholdCents,
        escalateOnDispute: true,
        escalateOnHardship: true,
        updatedAt: current.updatedAt,
      },
    });
  } catch (error) {
    console.error("[api/guardrails] Error reading guardrails:", error);
    return NextResponse.json(
      { error: "Failed to read guardrails" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    const ownerId = session?.ownerId;

    const body = await req.json();

    // Map maxPlanDurationDays -> maxPlanDays for shared schema if sent by legacy form
    const inputPayload = {
      ...body,
      maxPlanDays: body.maxPlanDays ?? body.maxPlanDurationDays,
    };

    const parsed = guardrailsSchema.safeParse(inputPayload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const normalized = normalizeGuardrails(parsed.data);
    const targetId = ownerId ? `guardrails-${ownerId}` : "default";

    const [updated] = await db
      .insert(guardrails)
      .values({
        id: targetId,
        ownerId: ownerId ?? null,
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
      })
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update guardrails" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      guardrails: {
        ...updated,
        maxPlanDays: updated.maxPlanDurationDays,
      },
      success: true,
    });
  } catch (error) {
    console.error("[api/guardrails] Error updating guardrails:", error);
    return NextResponse.json(
      { error: "Failed to update guardrails" },
      { status: 500 }
    );
  }
}
