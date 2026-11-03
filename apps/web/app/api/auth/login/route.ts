import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { owners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, loginSchema } from "@/lib/auth/password";
import { createSession } from "@/lib/session-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid login credentials";
      return NextResponse.json(
        { error: firstError, details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Look up owner by lowercased email
    const [owner] = await db
      .select()
      .from(owners)
      .where(eq(owners.email, email))
      .limit(1);

    if (!owner) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!owner.passwordHash) {
      return NextResponse.json(
        { error: "This account was created via PayPal. Please use the PayPal button below to sign in." },
        { status: 401 }
      );
    }

    // Verify password with timingSafeEqual
    const isValid = await verifyPassword(password, owner.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Update lastLoginAt
    await db
      .update(owners)
      .set({ lastLoginAt: new Date() })
      .where(eq(owners.id, owner.id));

    const onboardingCompleted = Boolean(owner.onboardingCompletedAt);

    // Issue fresh access cookie (15m) and refresh token (30d)
    await createSession({
      ownerId: owner.id,
      isDemo: owner.isDemo,
      onboardingCompleted,
    });

    const target = onboardingCompleted ? "/dashboard" : "/onboarding";

    return NextResponse.json({
      success: true,
      redirect: target,
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        displayName: owner.displayName,
        onboardingCompleted,
      },
    });
  } catch (error) {
    console.error("[login] Sign-in error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during sign in. Please try again." },
      { status: 500 }
    );
  }
}
