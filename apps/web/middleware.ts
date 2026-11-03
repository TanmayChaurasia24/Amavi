import { NextRequest, NextResponse } from "next/server";
import {
  verifySession,
  SESSION_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from "./src/lib/session";

// ─── In-memory Rate Limiter for Auth Routes ────────────────────────────────────
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  record.count += 1;
  return record.count > RATE_LIMIT_MAX_REQUESTS;
}

// ─── Open Redirect Protection ──────────────────────────────────────────────────
export function isValidRelativeRedirect(path: string | null | undefined): boolean {
  if (!path) return false;
  // Must start with a single '/' and not '//' or '/\'
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // 1. In-memory Rate Limiting on Auth Endpoints
  if (pathname.startsWith("/api/auth/")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many authentication requests. Please try again shortly." },
        { status: 429 }
      );
    }
  }

  // 2. Extract and verify session token
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  const hasRefreshToken = Boolean(req.cookies.get(REFRESH_COOKIE_NAME)?.value);

  // 3. Route-specific gating
  const isDashboardRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/account");
  const isOnboardingRoute = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const isLoginRoute = pathname === "/login";

  // Case A: User is on /login
  if (isLoginRoute) {
    if (session) {
      const nextParam = searchParams.get("next");
      const targetUrl =
        isValidRelativeRedirect(nextParam) && nextParam
          ? nextParam
          : session.onboardingCompleted
            ? "/dashboard"
            : "/onboarding";

      return NextResponse.redirect(new URL(targetUrl, req.url));
    }
    return NextResponse.next();
  }

  // Case B: User visits /onboarding
  if (isOnboardingRoute) {
    if (!session && !hasRefreshToken) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session?.onboardingCompleted) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Case C: User visits /dashboard or /account
  if (isDashboardRoute) {
    if (!session && !hasRefreshToken) {
      const loginUrl = new URL("/login", req.url);
      if (isValidRelativeRedirect(pathname)) {
        loginUrl.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    if (session && !session.onboardingCompleted) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (/icons, /images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

