import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { owners } from "@/db/schema";
import { getSession, destroySession } from "@/lib/session-server";
import { profileSchema } from "@/lib/guardrails";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    const ownerId = session?.ownerId ?? "owner-legacy";

    const owner = await db.query.owners.findFirst({
      where: eq(owners.id, ownerId),
    });

    if (!owner) {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 });
    }

    return NextResponse.json({
      owner: {
        id: owner.id,
        paypalPayerId: owner.paypalPayerId,
        email: owner.email,
        name: owner.name,
        displayName: owner.displayName,
        notificationEmail: owner.notificationEmail,
        timezone: owner.timezone,
        tone: owner.tone,
        businessNote: owner.businessNote ?? "",
        consentAcceptedAt: owner.consentAcceptedAt,
        consentVersion: owner.consentVersion,
        isDemo: owner.isDemo,
        createdAt: owner.createdAt,
        updatedAt: owner.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("[api/owner] Error fetching owner:", error);
    return NextResponse.json({ error: "Failed to fetch owner" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    const ownerId = session?.ownerId ?? "owner-legacy";

    const body = await req.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(owners)
      .set({
        displayName: parsed.data.displayName,
        notificationEmail: parsed.data.notificationEmail,
        timezone: parsed.data.timezone,
        tone: parsed.data.tone,
        businessNote: parsed.data.businessNote || null,
        lastLoginAt: new Date(),
      })
      .where(eq(owners.id, ownerId))
      .returning();

    return NextResponse.json({ success: true, owner: updated });
  } catch (error) {
    console.error("[api/owner] Error updating owner:", error);
    return NextResponse.json({ error: "Failed to update owner" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.isDemo || session.ownerId === "owner-demo") {
      return NextResponse.json(
        { error: "Demo account cannot be deleted" },
        { status: 403 }
      );
    }

    // Cascade delete on foreign keys will clean up guardrails, clients, invoices, etc.
    await db.delete(owners).where(eq(owners.id, session.ownerId));
    await destroySession();

    return NextResponse.json({ success: true, redirect: "/login" });
  } catch (error) {
    console.error("[api/owner] Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

