import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { platforms, Platform, isConfigured } from "@/lib/social-platforms";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { getPlanLimits } from "@/lib/plan-limits";
import { getAppUrlFromRequest } from "@/lib/env";
import { signOAuthState, generatePKCE } from "@/lib/oauth-state";
import { ensureUserFromClerk } from "@/lib/users";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const appUrl = getAppUrlFromRequest(req);

  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const platformId = (await params).platform as Platform;
    const platform = platforms[platformId];

    if (!platform) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    if (!isConfigured(platformId)) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "oauth.connect.platform_not_configured",
          platformId,
        }),
      );
      return NextResponse.redirect(
        `${appUrl}/accounts?error=platform_not_configured&platform=${platformId}`,
      );
    }

    const clientId = platform.clientId!;

    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const accountsCount = await db.select({ value: count() })
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, user.id));

    const limits = getPlanLimits(user.subscriptionPlan);
    if (accountsCount[0].value >= limits.maxSocialAccounts) {
      return NextResponse.redirect(`${appUrl}/billing?error=account_limit&limit=${limits.maxSocialAccounts}`);
    }

    const redirectUri = `${appUrl}/api/accounts/callback/${platformId}`;

    let codeVerifier: string | undefined;
    const searchParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: platform.scopes.join(" "),
    });

    if (platformId === "twitter") {
      const pkce = generatePKCE();
      codeVerifier = pkce.codeVerifier;
      searchParams.set("code_challenge", pkce.codeChallenge);
      searchParams.set("code_challenge_method", "S256");
    }

    const state = await signOAuthState(clerkId, platformId, codeVerifier);
    searchParams.set("state", state);

    if (platformId === "youtube") {
      searchParams.set("access_type", "offline");
      searchParams.set("prompt", "consent");
    }

    const authUrl = `${platform.authorizationUrl}?${searchParams.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    // Redirect with a short error code instead of bubbling a raw 500 to
    // the browser. The full error stays in the runtime logs where it
    // belongs. Common root causes: missing `oauth_states` table in the
    // production DB (migration 0003 not yet applied), missing
    // ENCRYPTION_KEY / DATABASE_URL env vars on the hosting platform,
    // or a dead Neon branch.
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(
      JSON.stringify({
        level: "error",
        event: "oauth.connect.failed",
        message,
        stack,
      }),
    );
    return NextResponse.redirect(`${appUrl}/accounts?error=connect_failed`);
  }
}
