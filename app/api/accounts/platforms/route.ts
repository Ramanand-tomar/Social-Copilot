import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { platforms, isConfigured, Platform } from "@/lib/social-platforms";
import { isPlatformPublishable } from "@/lib/publishers";
import { ensureUserFromClerk } from "@/lib/users";
import { getPlanLimits } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const connectedAccounts = await db
      .select({ platform: socialAccounts.platform })
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, user.id));

    const connectedPlatformsSet = new Set(connectedAccounts.map((a) => a.platform));
    const limits = getPlanLimits(user.subscriptionPlan);
    const limitReached = connectedAccounts.length >= limits.maxSocialAccounts;

    const list = (Object.keys(platforms) as Platform[]).map((id) => {
      const p = platforms[id];
      const configured = isConfigured(id);
      const publishable = isPlatformPublishable(id);
      return {
        id,
        name: p.name,
        configured,
        publishable,
        available: configured && publishable,
        connected: connectedPlatformsSet.has(id),
        limitReached,
      };
    });

    return NextResponse.json({ platforms: list, maxAccounts: limits.maxSocialAccounts, currentCount: connectedAccounts.length });
  } catch (error: unknown) {
    console.error("Fetch platforms error:", error);
    return NextResponse.json({ error: "Failed to fetch platforms" }, { status: 500 });
  }
}
