import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { posts, socialAccounts } from "@/lib/db/schema";
import { eq, and, inArray, count, ne } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { updatePostSchema, badRequest } from "@/lib/validation";
import { getStrictestContentLimit, Platform } from "@/lib/social-platforms";
import { getPlanLimits } from "@/lib/plan-limits";
import { ensureUserFromClerk } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    } = parsed.data;

    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // If the caller changed content and/or the selected accounts, re-enforce
    // the strictest per-platform length. We need the existing row to figure
    // out the effective state of each field after the patch applies.
    if (content !== undefined || accountIds !== undefined) {
      const existing = await db.query.posts.findFirst({
        where: and(eq(posts.id, id), eq(posts.userId, user.id)),
      });
      if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });

      const effectiveContent = content !== undefined ? content : existing.content;
      const effectiveAccountIds: string[] = accountIds !== undefined
        ? accountIds
        : (Array.isArray(existing.selectedAccounts) ? (existing.selectedAccounts as string[]) : []);

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
    }

    // Build a partial update. Only include fields the caller actually sent,
    // so a PATCH that only changes scheduledAt doesn't null out content etc.
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    if (content !== undefined) updateSet.content = content;
    if (status !== undefined) updateSet.status = status;
    if (mediaUrls !== undefined) updateSet.mediaUrls = mediaUrls;
    if (accountIds !== undefined) updateSet.selectedAccounts = accountIds;

    // scheduledAt has three distinct states:
    //   undefined  -> caller didn't touch it, leave it alone
    //   null       -> caller cleared the schedule
    //   string     -> new scheduled time
    let scheduledAtChanged = false;
    let newScheduledDate: Date | null = null;
    if (scheduledAt === null) {
      updateSet.scheduledAt = null;
      scheduledAtChanged = true;
    } else if (typeof scheduledAt === "string") {
      newScheduledDate = new Date(scheduledAt);
      updateSet.scheduledAt = newScheduledDate;
      scheduledAtChanged = true;
    }

    // Persist the IANA timezone alongside scheduledAt so the UI can render
    // "Publishes at 2:00 PM America/Toronto" even when the viewer is in a
    // different tz. Three-state mirror of scheduledAt above.
    if (scheduledTimezone === null) {
      updateSet.scheduledTimezone = null;
    } else if (typeof scheduledTimezone === "string") {
      updateSet.scheduledTimezone = scheduledTimezone;
    }

    // Rescheduling invalidates any previously acquired publish lock so the
    // new Inngest event can claim the post.
    if (scheduledAtChanged) {
      updateSet.publishLockAt = null;
    }

    // Plan-limit check: if this PATCH transitions the post into a
    // scheduled state (either by setting scheduledAt to a future time, or
    // by flipping status to "scheduled"), enforce the same quota the POST
    // route enforces. Without this check a user could repeatedly bypass
    // limits by creating drafts and PATCHing them into scheduled state.
    //
    // We exclude the row being patched from the count so a no-op PATCH on
    // an already-scheduled post doesn't fail its own existence test.
    const transitioningToScheduled =
      (scheduledAt !== undefined && scheduledAt !== null) ||
      status === "scheduled";

    if (transitioningToScheduled) {
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
          },
          { status: 403 },
        );
      }

      // If the caller transitions via scheduledAt without explicitly
      // sending status, force the row's status to "scheduled" so the
      // quota count above stays consistent with reality.
      if (status === undefined && scheduledAt !== undefined && scheduledAt !== null) {
        updateSet.status = "scheduled";
      }
    }

    const [updatedPost] = await db.update(posts)
      .set(updateSet)
      .where(and(eq(posts.id, id), eq(posts.userId, user.id)))
      .returning();

    if (!updatedPost) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    // If this PATCH set a new scheduledAt time, fire a new Inngest event.
    if (newScheduledDate) {
      const triggerAccountIds = accountIds || updatedPost.selectedAccounts;
      if (Array.isArray(triggerAccountIds) && triggerAccountIds.length > 0) {
        await inngest.send({
          name: "app/post.publish",
          data: {
            postId: updatedPost.id,
            accountIds: triggerAccountIds,
          },
          ts: newScheduledDate.getTime(),
        });
      }
    }

    return NextResponse.json(updatedPost);
  } catch (error: any) {
    console.error("Failed to update post:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [deletedPost] = await db.delete(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, user.id)))
      .returning();

    if (!deletedPost) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete post:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
