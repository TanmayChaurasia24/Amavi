import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/session-server";

export async function POST(req: NextRequest) {
  try {
    await destroySession();
    return NextResponse.json({ success: true, redirect: "/login" });
  } catch (error) {
    console.error("[logout] Error:", error);
    return NextResponse.json({ error: "Failed to log out" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", req.url));
}

