import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "settle_session";
export const REFRESH_COOKIE_NAME = "settle_refresh_token";

export const ACCESS_TOKEN_DURATION_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface SessionPayload {
  ownerId: string;
  isDemo?: boolean;
  onboardingCompleted?: boolean;
}

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    "settle_dev_secret_key_needs_to_be_at_least_32_chars_long!";
  return new TextEncoder().encode(secret);
}

/**
 * Signs an access session JWT using HS256 with a 15-minute expiration.
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({
    ownerId: payload.ownerId,
    isDemo: Boolean(payload.isDemo),
    onboardingCompleted: Boolean(payload.onboardingCompleted),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * Verifies a session JWT and returns the payload or null if invalid/expired.
 * Universally safe for Edge Middleware and Server components.
 */
export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    if (!payload.ownerId || typeof payload.ownerId !== "string") {
      return null;
    }

    return {
      ownerId: payload.ownerId,
      isDemo: Boolean(payload.isDemo),
      onboardingCompleted: Boolean(payload.onboardingCompleted),
    };
  } catch {
    return null;
  }
}
