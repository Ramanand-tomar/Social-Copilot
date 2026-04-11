import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { platforms, Platform } from "@/lib/social-platforms";

export type TokenRefreshStatus =
  | "success"
  | "no_refresh_token"
  | "unknown_platform"
  | "platform_not_configured"
  | "provider_error";

export interface TokenRefreshResult {
  accountId: string;
  status: TokenRefreshStatus;
  error?: string;
}

export function isKnownPlatform(value: string): value is Platform {
  return Object.prototype.hasOwnProperty.call(platforms, value);
}

/**
 * Refresh a single social account's OAuth token. Shared by the Inngest hourly
 * cron and the manual refresh endpoint. Returns a structured result rather
 * than throwing, because most call sites want to log and continue.
 */
export async function refreshAccountToken(
  account: typeof socialAccounts.$inferSelect,
): Promise<TokenRefreshResult> {
  if (!isKnownPlatform(account.platform)) {
    return { accountId: account.id, status: "unknown_platform" };
  }
  const platform = platforms[account.platform];
  if (!account.refreshToken) {
    return { accountId: account.id, status: "no_refresh_token" };
  }
  if (!platform.clientId || !platform.clientSecret) {
    return { accountId: account.id, status: "platform_not_configured" };
  }

  try {
    const refreshToken = decrypt(account.refreshToken);

    const res = await fetch(platform.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: platform.clientId,
        client_secret: platform.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      return {
        accountId: account.id,
        status: "provider_error",
        error: `Provider returned ${res.status}`,
      };
    }

    const data = await res.json();

    await db
      .update(socialAccounts)
      .set({
        accessToken: data.access_token ? encrypt(data.access_token) : account.accessToken,
        refreshToken: data.refresh_token ? encrypt(data.refresh_token) : account.refreshToken,
        expiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : account.expiresAt,
      })
      .where(eq(socialAccounts.id, account.id));

    return { accountId: account.id, status: "success" };
  } catch (error) {
    return {
      accountId: account.id,
      status: "provider_error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
