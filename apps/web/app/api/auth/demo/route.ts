import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session-server";

export async function POST(req: NextRequest) {
  try {
    await createSession({
      ownerId: "owner-demo",
      isDemo: true,
      onboardingCompleted: true,
    });

    return NextResponse.json({
      success: true,
      redirect: "/dashboard",
    });
  } catch (error) {
    console.error("[demo-login] Error:", error);
    return NextResponse.json(
      { error: "Failed to sign in as demo user" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  await createSession({
    ownerId: "owner-demo",
    isDemo: true,
    onboardingCompleted: true,
  });
  return NextResponse.redirect(new URL("/dashboard", req.url));
}

