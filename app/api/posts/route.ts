import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { posts, socialAccounts } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, isNotNull, inArray, sql, count } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { getPlanLimits } from "@/lib/plan-limits";
import { createPostSchema, listPostsQuerySchema, badRequest } from "@/lib/validation";
import { getStrictestContentLimit, Platform } from "@/lib/social-platforms";
import { ensureUserFromClerk } from "@/lib/users";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limited = enforceRateLimit(`posts:${clerkId}`, 30, 60_000);
  if (limited) return limited;

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const raw = await req.json();
    const parsed = createPostSchema.safeParse(raw);
    if (!parsed.success) return badRequest(parsed.error);
    const { content, mediaUrls, scheduledAt, scheduledTimezone, accountIds, status, intent } = parsed.data;

    const targetAccountIds = accountIds ?? [];
    let accountsForUser: { id: string; platform: string }[] = [];

    if (targetAccountIds.length > 0) {
      accountsForUser = await db
        .select({ id: socialAccounts.id, platform: socialAccounts.platform })
        .from(socialAccounts)
        .where(and(eq(socialAccounts.userId, user.id), inArray(socialAccounts.id, targetAccountIds)));

      if (accountsForUser.length !== targetAccountIds.length) {
        return NextResponse.json(
          { error: "invalid_accounts", message: "One or more selected accounts don't belong to you." },
          { status: 400 },
        );
      }

      const limit = getStrictestContentLimit(accountsForUser.map((a) => a.platform as Platform));
      if ((content ?? "").length > limit) {
        return NextResponse.json(
          {
            error: "content_too_long",
            limit,
            message: `Post is ${content!.length} characters but the strictest selected platform allows ${limit}.`,
          },
          { status: 400 },
        );
      }
    }

    const derivedStatus =
      intent === "publish_now"
        ? "queued"
        : intent === "schedule" || (scheduledAt && intent !== "draft")
        ? "scheduled"
        : intent === "draft"
        ? "draft"
        : status || "draft";

    const isScheduled = derivedStatus === "scheduled";

    if (isScheduled) {
      const [{ value: scheduledPostsCount }] = await db
        .select({ value: count() })
        .from(posts)
        .where(and(eq(posts.userId, user.id), eq(posts.status, "scheduled")));

      const limits = getPlanLimits(user.subscriptionPlan);
      if (scheduledPostsCount >= limits.maxScheduledPosts) {
        return NextResponse.json(
          {
            error: "limit_reached",
            limitName: "Scheduled Posts",
            message: `Plan limit reached. Your ${user.subscriptionPlan} plan allows max ${limits.maxScheduledPosts} scheduled posts.`,
            limit: limits.maxScheduledPosts,
            upgradeRequired: true,
          },
          { status: 403 },
        );
      }
    }

    const [created] = await db
      .insert(posts)
      .values({
        userId: user.id,
        content: content ?? "",
        mediaUrls: mediaUrls ?? [],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        scheduledTimezone: scheduledTimezone ?? null,
        status: derivedStatus,
        selectedAccounts: targetAccountIds,
        scheduleVersion: 1,
      })
      .returning();

    if (created.status === "queued" && targetAccountIds.length > 0) {
      await inngest.send({
        name: "app/post.publish",
        data: { postId: created.id, accountIds: targetAccountIds, scheduleVersion: 1 },
      });
    } else if (created.status === "scheduled" && scheduledAt && targetAccountIds.length > 0) {
      await inngest.send({
        name: "app/post.publish",
        data: { postId: created.id, accountIds: targetAccountIds, scheduleVersion: 1 },
        ts: new Date(scheduledAt).getTime(),
      });
    }

    return NextResponse.json(created);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Failed to create post:", error);
    return NextResponse.json({ error: "post_creation_failed", message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const queryResult = listPostsQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams),
    );
    if (!queryResult.success) return badRequest(queryResult.error);
    const { start, end, limit, offset } = queryResult.data;

    const conditions = [eq(posts.userId, user.id)];
    if (start && end) {
      conditions.push(isNotNull(posts.scheduledAt));
      conditions.push(gte(posts.scheduledAt, new Date(start)));
      conditions.push(lte(posts.scheduledAt, new Date(end)));
    }
    const whereClause = and(...conditions);

    const userPosts = await db.query.posts.findMany({
      where: whereClause,
      orderBy: [desc(posts.createdAt)],
      limit,
      offset,
      with: {
        platformResults: true,
      },
    });

    const [{ value: total }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(posts)
      .where(whereClause);

    return NextResponse.json({ posts: userPosts, total, limit, offset });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Failed to fetch posts:", error);
    return NextResponse.json({ error: "post_fetch_failed", message }, { status: 500 });
  }
}
