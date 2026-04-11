import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { posts, socialAccounts, autoReplyRules, mediaAssets } from "@/lib/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { getPlanLimits } from "@/lib/plan-limits";
import { ensureUserFromClerk } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const limits = getPlanLimits(user.subscriptionPlan);

    // 1. Count Accounts
    const accountsCount = await db.select({ value: count() })
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, user.id));

    // 2. Count Scheduled Posts
    const postsCount = await db.select({ value: count() })
      .from(posts)
      .where(eq(posts.userId, user.id));

    // 3. Count Auto-Reply Rules
    const rulesCount = await db.select({ value: count() })
      .from(autoReplyRules)
      .where(eq(autoReplyRules.userId, user.id));

    // 4. Storage Usage
    const storageResult = await db.select({ total: sql<number>`sum(${mediaAssets.size})` })
      .from(mediaAssets)
      .where(eq(mediaAssets.userId, user.id));
    const storageUsedMB = Math.round(Number(storageResult[0]?.total || 0) / (1024 * 1024));

    return NextResponse.json({
      plan: user.subscriptionPlan,
      limits,
      usage: {
        accounts: accountsCount[0].value,
        posts: postsCount[0].value,
        rules: rulesCount[0].value,
        storageMB: storageUsedMB,
        aiCaptions: user.totalAiCaptions,
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch billing usage:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
