import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { refreshTokens, owners } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import {
  signSession,
  verifySession,
  SessionPayload,
  SESSION_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  ACCESS_TOKEN_DURATION_SECONDS,
  REFRESH_TOKEN_DURATION_SECONDS,
} from "./session";

export * from "./session";

/**
 * Computes a SHA-256 hash of a raw token for safe storage in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Issues both an access token (JWT cookie) and a refresh token (persisted in DB + cookie).
 */
export async function issueTokens(payload: SessionPayload): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  // 1. Sign 15-minute access JWT
  const accessToken = await signSession(payload);

  // 2. Generate cryptographically secure random refresh token (32 bytes = 64 hex chars)
  const rawRefreshToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_DURATION_SECONDS * 1000
  );

  // 3. Persist refresh token hash in database
  await db.insert(refreshTokens).values({
    ownerId: payload.ownerId,
    tokenHash,
    expiresAt,
  });

  // 4. Set both cookies in the response
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_DURATION_SECONDS,
  });

  cookieStore.set(REFRESH_COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_DURATION_SECONDS,
  });

  return { accessToken, refreshToken: rawRefreshToken };
}

/**
 * Creates and sets the settle_session and settle_refresh_token httpOnly cookies.
 */
export async function createSession(payload: SessionPayload): Promise<void> {
  await issueTokens(payload);
}

/**
 * Attempts to rotate/refresh tokens using the settle_refresh_token cookie.
 * If valid and unexpired:
 * 1. Invalidates the old refresh token (rotation).
 * 2. Fetches the latest owner record (to ensure up-to-date onboarding and demo status).
 * 3. Issues a fresh pair of access and refresh tokens.
 */
export async function refreshSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
    if (!rawToken) return null;

    const tokenHash = hashToken(rawToken);
    const now = new Date();

    // Look up active token in DB
    const [record] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, now)
        )
      )
      .limit(1);

    if (!record) {
      // Invalid, revoked, or expired token -> clear cookies
      cookieStore.delete(SESSION_COOKIE_NAME);
      cookieStore.delete(REFRESH_COOKIE_NAME);
      return null;
    }

    // Mark current token as revoked (one-time rotation)
    await db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(eq(refreshTokens.id, record.id));

    // Fetch owner to ensure account still exists and get latest onboarding state
    const [owner] = await db
      .select()
      .from(owners)
      .where(eq(owners.id, record.ownerId))
      .limit(1);

    if (!owner) {
      cookieStore.delete(SESSION_COOKIE_NAME);
      cookieStore.delete(REFRESH_COOKIE_NAME);
      return null;
    }

    const payload: SessionPayload = {
      ownerId: owner.id,
      isDemo: owner.isDemo,
      onboardingCompleted: Boolean(owner.onboardingCompletedAt),
    };

    // Issue fresh pair of tokens
    await issueTokens(payload);

    return payload;
  } catch (error) {
    console.error("[refreshSession] Error during token rotation:", error);
    return null;
  }
}

/**
 * Retrieves and validates the current session from incoming request cookies.
 * If the access token is expired or absent, seamlessly attempts to rotate and refresh
 * using the settle_refresh_token cookie.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const verified = await verifySession(token);
    if (verified) return verified;
  }

  // If access token is invalid or expired, check for refresh token
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  if (refreshToken) {
    return await refreshSession();
  }

  return null;
}

/**
 * Destroys the current session by revoking the refresh token in the DB
 * and clearing both auth cookies.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(REFRESH_COOKIE_NAME);
  } catch (error) {
    console.error("[destroySession] Error revoking token:", error);
    try {
      const cookieStore = await cookies();
      cookieStore.delete(SESSION_COOKIE_NAME);
      cookieStore.delete(REFRESH_COOKIE_NAME);
    } catch {
      // Ignore cookie deletion error
    }
  }
}

