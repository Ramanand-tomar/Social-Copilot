import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { posts, socialAccounts } from "@/lib/db/schema";
import { eq, and, inArray, count, ne, sql } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { updatePostSchema, badRequest } from "@/lib/validation";
import { getStrictestContentLimit, Platform } from "@/lib/social-platforms";
import { getPlanLimits } from "@/lib/plan-limits";
import { ensureUserFromClerk } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const post = await db.query.posts.findFirst({
      where: and(eq(posts.id, id), eq(posts.userId, user.id)),
      with: {
        platformResults: true,
      },
    });

    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: "post_fetch_failed", message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const raw = await req.json();
    const parsed = updatePostSchema.safeParse(raw);
    if (!parsed.success) return badRequest(parsed.error);
    const {
      content,
      scheduledAt,
      scheduledTimezone,
      status,
      mediaUrls,
      accountIds,
      intent,
    } = parsed.data;

    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const existing = await db.query.posts.findFirst({
      where: and(eq(posts.id, id), eq(posts.userId, user.id)),
    });
    if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const effectiveContent = content !== undefined ? content : existing.content;
    const effectiveAccountIds: string[] =
      accountIds !== undefined
        ? accountIds
        : Array.isArray(existing.selectedAccounts)
        ? (existing.selectedAccounts as string[])
        : [];

    if (effectiveAccountIds.length > 0) {
      const accountRows = await db
        .select({ id: socialAccounts.id, platform: socialAccounts.platform })
        .from(socialAccounts)
        .where(and(eq(socialAccounts.userId, user.id), inArray(socialAccounts.id, effectiveAccountIds)));

      if (accountRows.length !== effectiveAccountIds.length) {
        return NextResponse.json(
          { error: "invalid_accounts", message: "One or more selected accounts don't belong to you." },
          { status: 400 },
        );
      }

      const limit = getStrictestContentLimit(accountRows.map((a) => a.platform as Platform));
      if ((effectiveContent ?? "").length > limit) {
        return NextResponse.json(
          {
            error: "content_too_long",
            limit,
            message: `Post is ${(effectiveContent ?? "").length} characters but the strictest selected platform allows ${limit}.`,
          },
          { status: 400 },
        );
      }
    }

    const updateSet: Record<string, unknown> = {
      updatedAt: new Date(),
      scheduleVersion: sql`${posts.scheduleVersion} + 1`,
    };

    if (content !== undefined) updateSet.content = content;
    if (mediaUrls !== undefined) updateSet.mediaUrls = mediaUrls;
    if (accountIds !== undefined) updateSet.selectedAccounts = accountIds;

    let targetStatus = status;
    if (intent === "publish_now") {
      targetStatus = "queued";
    } else if (intent === "schedule" || (scheduledAt && intent !== "draft")) {
      targetStatus = "scheduled";
    } else if (intent === "draft") {
      targetStatus = "draft";
    }

    if (targetStatus !== undefined) updateSet.status = targetStatus;

    if (scheduledAt === null) {
      updateSet.scheduledAt = null;
    } else if (typeof scheduledAt === "string") {
      updateSet.scheduledAt = new Date(scheduledAt);
    }

    if (scheduledTimezone === null) {
      updateSet.scheduledTimezone = null;
    } else if (typeof scheduledTimezone === "string") {
      updateSet.scheduledTimezone = scheduledTimezone;
    }

    // Cancel prior schedule if unscheduling or switching to draft
    const isNowDraftOrUnscheduled = targetStatus === "draft" || scheduledAt === null;
    if (isNowDraftOrUnscheduled && existing.status === "scheduled") {
      await inngest.send({
        name: "app/post.publish.cancelled",
        data: { postId: existing.id },
      });
    }

    if (targetStatus === "scheduled") {
      const [{ value: scheduledPostsCount }] = await db
        .select({ value: count() })
        .from(posts)
        .where(
          and(
            eq(posts.userId, user.id),
            eq(posts.status, "scheduled"),
            ne(posts.id, id),
          ),
        );

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

    const [updatedPost] = await db
      .update(posts)
      .set(updateSet)
      .where(and(eq(posts.id, id), eq(posts.userId, user.id)))
      .returning();

    if (!updatedPost) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const triggerAccounts = effectiveAccountIds;
    if (updatedPost.status === "queued" && triggerAccounts.length > 0) {
      await inngest.send({
        name: "app/post.publish",
        data: {
          postId: updatedPost.id,
          accountIds: triggerAccounts,
          scheduleVersion: updatedPost.scheduleVersion,
        },
      });
    } else if (updatedPost.status === "scheduled" && updatedPost.scheduledAt && triggerAccounts.length > 0) {
      await inngest.send({
        name: "app/post.publish",
        data: {
          postId: updatedPost.id,
          accountIds: triggerAccounts,
          scheduleVersion: updatedPost.scheduleVersion,
        },
        ts: new Date(updatedPost.scheduledAt).getTime(),
      });
    }

    return NextResponse.json(updatedPost);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Failed to update post:", error);
    return NextResponse.json({ error: "post_update_failed", message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [deletedPost] = await db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, user.id)))
      .returning();

    if (!deletedPost) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    // Send cancellation event to Inngest
    await inngest.send({
      name: "app/post.publish.cancelled",
      data: { postId: deletedPost.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Failed to delete post:", error);
    return NextResponse.json({ error: "post_delete_failed", message }, { status: 500 });
  }
}
