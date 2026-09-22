import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { platforms, Platform, isConfigured } from "@/lib/social-platforms";
import { getPlanLimits } from "@/lib/plan-limits";
import { encrypt } from "@/lib/encryption";
import { getAppUrlFromRequest } from "@/lib/env";
import { consumeOAuthState } from "@/lib/oauth-state";
import { ensureUserFromClerk } from "@/lib/users";

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
  const consumedState = await consumeOAuthState(state, clerkId, platformId);
  if (!consumedState) {
    return NextResponse.redirect(`${appUrl}/accounts?error=invalid_state`);
  }

  if (!isConfigured(platformId)) {
    return NextResponse.redirect(`${appUrl}/accounts?error=platform_not_configured`);
  }

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) {
      throw new Error("User not found in database");
    }

    // Check account plan limits at callback time as well
    const existingAccounts = await db
      .select({ id: socialAccounts.id, platformAccountId: socialAccounts.platformAccountId })
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, user.id));

    const limits = getPlanLimits(user.subscriptionPlan);
    const isAlreadyConnected = existingAccounts.some(a => a.platformAccountId === platformId);
    if (!isAlreadyConnected && existingAccounts.length >= limits.maxSocialAccounts) {
      return NextResponse.redirect(`${appUrl}/billing?error=account_limit&limit=${limits.maxSocialAccounts}`);
    }

    // 1. Exchange code for tokens
    const bodyParams: Record<string, string> = {
      client_id: platform.clientId!,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${appUrl}/api/accounts/callback/${platformId}`,
    };

    if (platformId === "twitter") {
      if (consumedState.codeVerifier) {
        bodyParams.code_verifier = consumedState.codeVerifier;
      }
    } else {
      bodyParams.client_secret = platform.clientSecret!;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    if (platformId === "twitter") {
      const authHeader = Buffer.from(`${platform.clientId}:${platform.clientSecret}`).toString("base64");
      headers["Authorization"] = `Basic ${authHeader}`;
    }

    const tokenResponse = await fetch(platform.tokenUrl, {
      method: "POST",
      headers,
      body: new URLSearchParams(bodyParams),
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
      const profileRes = await fetch(
        "https://graph.instagram.com/v21.0/me?fields=user_id,username",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      const profileData = await profileRes.json();
      if (profileRes.ok && (profileData.user_id || profileData.id)) {
        platformAccountId = String(profileData.user_id ?? profileData.id);
        platformUsername = profileData.username;
      }
    } else if (platformId === "linkedin") {
      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profileData = await profileRes.json();
      if (profileRes.ok && profileData.sub) {
        platformAccountId = profileData.sub;
        platformUsername = profileData.name || profileData.email;
      }
    }

    if (!platformAccountId) {
      platformAccountId = `mock_${platformId}_${Date.now()}`;
      platformUsername = `${platform.name} User`;
    }

    // 3. Save / Upsert to Database
    await db
      .insert(socialAccounts)
      .values({
        userId: user.id,
        platform: platformId,
        platformAccountId,
        platformUsername,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      })
      .onConflictDoUpdate({
        target: [socialAccounts.userId, socialAccounts.platform, socialAccounts.platformAccountId],
        set: {
          platformUsername,
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
          expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        },
      });

    return NextResponse.redirect(`${appUrl}/accounts?success=true&platform=${platformId}`);
  } catch (error) {
    console.error("OAuth Callback Error:", error);
    return NextResponse.redirect(`${appUrl}/accounts?error=callback_failed`);
  }
}
