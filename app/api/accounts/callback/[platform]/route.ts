import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { platforms, Platform } from "@/lib/social-platforms";
import { encrypt } from "@/lib/encryption";
import { getAppUrlFromRequest } from "@/lib/env";
import { consumeOAuthState } from "@/lib/oauth-state";
import { ensureUserFromClerk } from "@/lib/users";

const PLATFORMS_WITH_REAL_PROFILE_FETCH: ReadonlySet<Platform> = new Set(["twitter", "instagram"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  // Must mirror the origin used when building the OAuth URL in the
  // connect route — otherwise the token exchange's redirect_uri check
  // fails and Meta/Twitter reject the request.
  const appUrl = getAppUrlFromRequest(req);

  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const platformId = (await params).platform as Platform;
  const platform = platforms[platformId];
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!platform || !code) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Consume the one-time state. Wrap in try/catch so a DB-level failure
  // (e.g. missing `oauth_states` table in production) redirects with a
  // clear error code instead of bubbling an opaque 500 to the browser.
  try {
    if (!(await consumeOAuthState(state, clerkId, platformId))) {
      return NextResponse.redirect(`${appUrl}/accounts?error=invalid_state`);
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "oauth.callback.state_consume_failed",
        platformId,
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.redirect(`${appUrl}/accounts?error=state_unavailable`);
  }

  // Refuse platforms where we don't have real profile fetching — otherwise
  // we'd store mock ids which look like real connected accounts.
  if (!PLATFORMS_WITH_REAL_PROFILE_FETCH.has(platformId)) {
    return NextResponse.redirect(`${appUrl}/accounts?error=platform_not_supported`);
  }

  if (!platform.clientId || !platform.clientSecret) {
    return NextResponse.redirect(`${appUrl}/accounts?error=platform_not_configured`);
  }

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await fetch(platform.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: platform.clientId,
        client_secret: platform.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${appUrl}/api/accounts/callback/${platformId}`,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok || !tokens.access_token) {
      console.error("Token exchange failed:", tokens);
      throw new Error("Failed to exchange token");
    }

    // 2. Fetch User Profile
    let platformAccountId: string | null = null;
    let platformUsername: string | null = null;

    if (platformId === "twitter") {
      const profileRes = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profileData = await profileRes.json();
      if (profileRes.ok && profileData.data) {
        platformAccountId = profileData.data.id;
        platformUsername = profileData.data.username;
      }
    } else if (platformId === "instagram") {
      // Never put the access token in the URL — it leaks into server/proxy
      // logs, browser history, and downstream observability tools.
      // The "Instagram API with Instagram Login" flow returns `user_id` +
      // `username` from graph.instagram.com/me.
      const profileRes = await fetch(
        "https://graph.instagram.com/v21.0/me?fields=user_id,username",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      const profileData = await profileRes.json();
      if (profileRes.ok && (profileData.user_id || profileData.id)) {
        platformAccountId = String(profileData.user_id ?? profileData.id);
        platformUsername = profileData.username;
      }
    }

    if (!platformAccountId) {
      throw new Error("Failed to fetch platform profile");
    }

    // 3. Get Internal User ID (lazily creates the row from Clerk if missing)
    const user = await ensureUserFromClerk(clerkId);

    if (!user) {
      throw new Error("User not found in database");
    }

    // 4. Save to Database
    await db.insert(socialAccounts).values({
      userId: user.id,
      platform: platformId,
      platformAccountId,
      platformUsername,
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
    });

    // Token refresh is handled by the hourly Inngest cron (`refresh-tokens`),
    // which picks up any account whose `expiresAt` falls within 2 hours.

    return NextResponse.redirect(`${appUrl}/accounts?success=true`);
  } catch (error) {
    console.error("OAuth Callback Error:", error);
    return NextResponse.redirect(`${appUrl}/accounts?error=callback_failed`);
  }
}
