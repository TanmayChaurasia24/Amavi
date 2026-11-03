import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/session-server";

export async function POST() {
  try {
    const session = await refreshSession();
    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired session. Please sign in again." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("[refresh] Error refreshing session:", error);
    return NextResponse.json(
      { error: "Failed to refresh session." },
      { status: 500 }
    );
  }
}
