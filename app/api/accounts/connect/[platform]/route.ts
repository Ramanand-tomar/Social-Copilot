import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { platforms, Platform } from "@/lib/social-platforms";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { getPlanLimits } from "@/lib/plan-limits";
import { getAppUrlFromRequest } from "@/lib/env";
import { signOAuthState } from "@/lib/oauth-state";
import { ensureUserFromClerk } from "@/lib/users";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use the actual origin of the request, not the env fallback. This
  // ensures the OAuth redirect_uri matches whatever host the user is
  // browsing on (localhost in dev, ngrok for mobile testing, the real
  // domain in prod) so session cookies round-trip correctly.
  const appUrl = getAppUrlFromRequest(req);

  // Plan limit check
  const user = await ensureUserFromClerk(clerkId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const accountsCount = await db.select({ value: count() })
    .from(socialAccounts)
    .where(eq(socialAccounts.userId, user.id));

  const limits = getPlanLimits(user.subscriptionPlan);
  if (accountsCount[0].value >= limits.maxSocialAccounts) {
    return NextResponse.redirect(`${appUrl}/billing?error=account_limit&limit=${limits.maxSocialAccounts}`);
  }

  const platformId = (await params).platform as Platform;
  const platform = platforms[platformId];

  if (!platform) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const clientId = platform.clientId;
  if (!clientId) {
    return NextResponse.json(
      { error: `Client ID not configured for ${platform.name}` },
      { status: 500 }
    );
  }

  const redirectUri = `${appUrl}/api/accounts/callback/${platformId}`;
  const state = await signOAuthState(clerkId, platformId);

  // Standard OAuth 2.0 params that every supported provider accepts.
  const searchParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: platform.scopes.join(" "),
    state,
  });

  // Google-specific params. Sending these to Twitter/Meta/etc. either errors
  // on strict validators or gets silently dropped, neither of which we want.
  if (platformId === "youtube") {
    searchParams.set("access_type", "offline");
    searchParams.set("prompt", "consent");
  }

  const authUrl = `${platform.authorizationUrl}?${searchParams.toString()}`;

  return NextResponse.redirect(authUrl);
}
