const REQUIRED_SERVER_VARS = [
  "DATABASE_URL",
  "ENCRYPTION_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

type RequiredVar = (typeof REQUIRED_SERVER_VARS)[number];

export function validateServerEnv(): void {
  for (const name of REQUIRED_SERVER_VARS) {
    requireEnv(name);
  }
}

export function requireEnv(name: RequiredVar | string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function getAppUrl(): string {
  return requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
}

/**
 * Returns the origin of the current request (preferred) or the configured
 * NEXT_PUBLIC_APP_URL. This is important for OAuth redirect_uri building:
 * the redirect_uri MUST match the origin the user is currently browsing on,
 * otherwise session cookies set for that origin won't be sent on the
 * callback request and `auth()` will return null.
 *
 * Prefer this over getAppUrl() inside request handlers.
 */
export function getAppUrlFromRequest(req: Request): string {
  // Trust the forwarded headers first (ngrok, Vercel, Cloudflare all set
  // these), then fall back to the request URL itself, then the env var.
  const forwardedHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const forwardedProto =
    req.headers.get("x-forwarded-proto") ??
    (forwardedHost?.includes("localhost") ? "http" : "https");

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
  }

  try {
    return new URL(req.url).origin;
  } catch {
    return getAppUrl();
  }
}
