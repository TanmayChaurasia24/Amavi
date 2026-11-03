import { env, PAYPAL_BASE_URL } from "../env";

// ─── Token cache ──────────────────────────────────────────────────────────────
interface TokenCache {
  accessToken: string;
  expiresAt: number; // ms epoch
}

let tokenCache: TokenCache | null = null;
const EXPIRY_MARGIN_MS = 60_000; // refresh 60s before actual expiry

async function fetchAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const debugId = res.headers.get("PayPal-Debug-Id");
    const text = await res.text();
    throw new Error(
      `PayPal token fetch failed: ${res.status} ${res.statusText} | debug-id: ${debugId} | body: ${text}`
    );
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - EXPIRY_MARGIN_MS,
  };
  return tokenCache.accessToken;
}

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }
  return fetchAccessToken();
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
export interface PaypalFetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Raw body as string (used for webhook verification) */
  rawBody?: string;
}

export interface PaypalResponse<T> {
  data: T;
  status: number;
  debugId: string | null;
}

export async function paypalFetch<T = unknown>(
  path: string,
  options: PaypalFetchOptions = {},
  _retry = true
): Promise<PaypalResponse<T>> {
  const token = await getToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const fetchOptions: RequestInit = {
    method: options.method ?? "GET",
    headers,
  };

  if (options.rawBody !== undefined) {
    fetchOptions.body = options.rawBody;
  } else if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const url = path.startsWith("http") ? path : `${PAYPAL_BASE_URL}${path}`;
  const res = await fetch(url, fetchOptions);
  const debugId = res.headers.get("PayPal-Debug-Id");

  if (res.status === 401 && _retry) {
    // Force token refresh and retry once
    tokenCache = null;
    return paypalFetch<T>(path, options, false);
  }

  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {}
    throw new PayPalApiError(
      `PayPal API error: ${res.status} ${res.statusText}`,
      res.status,
      debugId,
      body
    );
  }

  // Some endpoints return 204 No Content
  let data: T;
  const contentType = res.headers.get("content-type") ?? "";
  if (res.status === 204 || !contentType.includes("application/json")) {
    data = {} as T;
  } else {
    data = (await res.json()) as T;
  }

  return { data, status: res.status, debugId };
}

// ─── Custom error class ───────────────────────────────────────────────────────
export class PayPalApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly debugId: string | null,
    public readonly body: string
  ) {
    super(message);
    this.name = "PayPalApiError";
  }
}
