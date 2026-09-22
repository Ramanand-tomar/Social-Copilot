import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getIKAuthenticationParameters } from "@/lib/imagekit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ensureUserFromClerk } from "@/lib/users";
import { getPlanLimits } from "@/lib/plan-limits";
import { db } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limited = enforceRateLimit(`media-auth:${userId}`, 30, 60_000);
  if (limited) return limited;

  try {
    const user = await ensureUserFromClerk(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const limits = getPlanLimits(user.subscriptionPlan);
    const [{ value: totalBytesUsed }] = await db
      .select({ value: sql<number>`COALESCE(sum(size), 0)::bigint` })
      .from(mediaAssets)
      .where(eq(mediaAssets.userId, user.id));

    const maxBytes = limits.maxStorageMB * 1024 * 1024;
    if (Number(totalBytesUsed) >= maxBytes) {
      return NextResponse.json(
        {
          error: "limit_reached",
          limitName: "Storage Limit",
          message: `Your ${user.subscriptionPlan} plan storage limit of ${limits.maxStorageMB} MB has been reached.`,
          upgradeRequired: true,
        },
        { status: 403 },
      );
    }

    const params = getIKAuthenticationParameters();
    return NextResponse.json({ ...params, folder: `/users/${user.id}` });
  } catch (error) {
    console.error("ImageKit auth error:", error);
    return NextResponse.json(
      { error: "upload_auth_failed", message: "Failed to generate upload authorization token." },
      { status: 500 },
    );
  }
}
