import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { posts, socialAccounts } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, count, isNotNull, inArray, sql } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { getPlanLimits } from "@/lib/plan-limits";
import { createPostSchema, listPostsQuerySchema, badRequest } from "@/lib/validation";
import { getStrictestContentLimit, Platform } from "@/lib/social-platforms";
import { ensureUserFromClerk } from "@/lib/users";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforceRateLimit(`posts:${clerkId}`, 30, 60_000);
  if (limited) return limited;

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const raw = await req.json();
    const parsed = createPostSchema.safeParse(raw);
    if (!parsed.success) return badRequest(parsed.error);
    const { content, mediaUrls, scheduledAt, scheduledTimezone, accountIds, status } = parsed.data;

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

    const isScheduled = !!scheduledAt || status === "scheduled";

    const newPost = await db.transaction(async (tx) => {
      if (isScheduled) {
        const [{ value: scheduledPostsCount }] = await tx
          .select({ value: count() })
          .from(posts)
          .where(and(eq(posts.userId, user.id), eq(posts.status, "scheduled")));

        const limits = getPlanLimits(user.subscriptionPlan);
        if (scheduledPostsCount >= limits.maxScheduledPosts) {
          throw new PlanLimitError(
            `Plan limit reached. Your ${user.subscriptionPlan} plan allows max ${limits.maxScheduledPosts} scheduled posts.`,
            limits.maxScheduledPosts,
          );
        }
      }

      const [created] = await tx.insert(posts).values({
        userId: user.id,
        content: content ?? "",
        mediaUrls: mediaUrls ?? [],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        scheduledTimezone: scheduledTimezone ?? null,
        status: status || (isScheduled ? "scheduled" : "posted"),
        selectedAccounts: targetAccountIds,
      }).returning();
      return created;
    });

    if (newPost.status === "posted" && targetAccountIds.length > 0) {
      await inngest.send({
        name: "app/post.publish",
        data: { postId: newPost.id, accountIds: targetAccountIds },
      });
    } else if (newPost.status === "scheduled" && scheduledAt && targetAccountIds.length > 0) {
      await inngest.send({
        name: "app/post.publish",
        data: { postId: newPost.id, accountIds: targetAccountIds },
        ts: new Date(scheduledAt).getTime(),
      });
    }

    return NextResponse.json(newPost);
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json(
        {
          error: "limit_reached",
          limitName: "Scheduled Posts",
          message: error.message,
          limit: error.limit,
          upgradeRequired: true,
        },
        { status: 403 },
      );
    }
    console.error("Failed to create post:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

class PlanLimitError extends Error {
  constructor(message: string, public limit: number) {
    super(message);
  }
}

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  } catch (error: any) {
    console.error("Failed to fetch posts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
