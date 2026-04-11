import { z } from "zod";
import { inngest } from "../client";
import { db } from "@/lib/db";
import { posts, socialAccounts, postPlatformResults } from "@/lib/db/schema";
import { eq, inArray, and, or, isNull, lt } from "drizzle-orm";

// How long a publish-lock is valid before another worker is allowed to
// steal it. The lock is a *lease*, not a permanent flag, so a crashed or
// timed-out run never leaves a post stuck behind `already_locked`.
//
// Sized to comfortably exceed the worst-case fan-out: 50 accounts * a
// few seconds each + retries, with headroom. If a real run somehow needs
// longer it should mark the post terminal (`posted` / `partial` /
// `failed`) before the lease expires.
const PUBLISH_LOCK_LEASE_MS = 10 * 60 * 1000;
const TERMINAL_STATUSES = ["posted", "partial", "failed"] as const;

const postPublishEventSchema = z.object({
  postId: z.string().uuid(),
  accountIds: z.array(z.string().uuid()).min(1).max(50),
});

export const postPublishFunction = inngest.createFunction(
  {
    id: "post-publish",
    retries: 3,
    // One publish attempt per post at a time — stops Inngest retries and
    // reschedules from fighting each other over the same row.
    concurrency: [{ key: "event.data.postId", limit: 1 }],
    triggers: [{ event: "app/post.publish" }],
  },
  async ({ event, step }) => {
    // Validate payload. If this ever throws, it means either schema drift
    // or someone pushing forged events — we want loud failure in both cases.
    const parsed = postPublishEventSchema.safeParse(event.data);
    if (!parsed.success) {
      return { skipped: true, reason: "invalid_payload", issues: parsed.error.issues };
    }
    const { postId, accountIds } = parsed.data;

    // 1. Fetch Post
    const postData = await step.run("fetch-post-data", async () => {
      const p = await db.query.posts.findFirst({
        where: eq(posts.id, postId),
      });
      if (!p) throw new Error("Post not found");
      return p;
    });

    // 2. Reschedule detection
    if (event.ts && postData.scheduledAt) {
      const dbTs = new Date(postData.scheduledAt).getTime();
      if (dbTs !== event.ts) {
        console.log(
          `Reschedule detected for post ${postId}. DB: ${dbTs}, Event: ${event.ts}. Skipping old job.`
        );
        return { skipped: true, reason: "rescheduled" };
      }
    }

    // 3. Lease-based publish-lock.
    //
    // The previous implementation set `publishLockAt` once and only
    // checked `IS NULL`, so any failed run that didn't reach a terminal
    // status left the row pinned forever. This version makes the lock a
    // *lease*: a worker can acquire it iff one of these is true:
    //   a) the lock is unset (fresh post), OR
    //   b) the lease has expired (`publishLockAt < now - LEASE`),
    // AND the post is not already in a terminal state. The status check
    // is what protects already-`posted`/`partial`/`failed` rows.
    //
    // The UPDATE itself is the atomic compare-and-swap — only one worker
    // can flip a given row's `publishLockAt` to `now()` at a time.
    if (TERMINAL_STATUSES.includes(postData.status as (typeof TERMINAL_STATUSES)[number])) {
      console.log(`Post ${postId} already in terminal status "${postData.status}". Skipping.`);
      return { skipped: true, reason: "already_terminal", status: postData.status };
    }

    const leaseCutoff = new Date(Date.now() - PUBLISH_LOCK_LEASE_MS);
    const lockResult = await step.run("acquire-publish-lock", async () => {
      const locked = await db
        .update(posts)
        .set({ publishLockAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(posts.id, postId),
            // Re-check the terminal-status guard inside the UPDATE so a
            // concurrent finisher can't squeeze in between the read and
            // the lock acquisition.
            inArray(
              posts.status,
              ["draft", "scheduled", "posting"] as unknown as string[],
            ),
            or(
              isNull(posts.publishLockAt),
              lt(posts.publishLockAt, leaseCutoff),
            ),
          ),
        )
        .returning({ id: posts.id, previousLockAt: posts.publishLockAt });
      return locked.length > 0;
    });

    if (!lockResult) {
      console.log(
        `Post ${postId} lock unavailable (held by another worker within lease window or terminal). Skipping.`,
      );
      return { skipped: true, reason: "lock_unavailable" };
    }

    // 4. Fetch target accounts — MUST be scoped to the post's owner, otherwise
    // a spoofed event could publish via another user's social account.
    const accounts = await step.run("fetch-target-accounts", async () => {
      if (!Array.isArray(accountIds) || accountIds.length === 0) return [];
      return await db.query.socialAccounts.findMany({
        where: and(
          inArray(socialAccounts.id, accountIds),
          eq(socialAccounts.userId, postData.userId),
        ),
      });
    });

    // 5. Publish to each platform (idempotent per account — a unique index
    // on (post_id, social_account_id) makes duplicate inserts a no-op).
    const results: Array<{ platform: string; status: string; resultId: string | null }> = [];
    for (const account of accounts) {
      const platformResult = await step.run(`publish-${account.platform}-${account.id}`, async () => {
        // Skip if this (post, account) pair was already processed by a
        // previous retry that made it past the insert.
        const existing = await db.query.postPlatformResults.findFirst({
          where: and(
            eq(postPlatformResults.postId, postId),
            eq(postPlatformResults.socialAccountId, account.id),
          ),
        });
        if (existing) {
          return {
            platform: account.platform,
            status: existing.status,
            resultId: existing.id,
          };
        }

        try {
          // MOCK PUBLISHING LOGIC — real platform adapters plug in here.
          console.log(`Publishing to ${account.platform} for account ${account.id}`);
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const [res] = await db.insert(postPlatformResults).values({
            postId: postId,
            socialAccountId: account.id,
            status: "success",
            externalPostId: `mock_${account.platform}_${Date.now()}`,
          }).returning();

          return { platform: account.platform, status: "success", resultId: res.id };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Failed to publish to ${account.platform}:`, message);

          const [res] = await db.insert(postPlatformResults).values({
            postId: postId,
            socialAccountId: account.id,
            status: "failed",
            errorMessage: message,
          }).returning();

          return { platform: account.platform, status: "failed", resultId: res.id };
        }
      });
      results.push(platformResult);
    }

    // 6. Update main post status. Always clear `publishLockAt` here so
    // the lock is released on the same write that records the terminal
    // status — no orphaned leases on the happy path.
    await step.run("update-post-status", async () => {
      const allSuccess = results.length > 0 && results.every((r) => r.status === "success");
      const someSuccess = results.some((r) => r.status === "success");

      await db.update(posts)
        .set({
          status: allSuccess ? "posted" : someSuccess ? "partial" : "failed",
          publishLockAt: null,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId));
    });

    return { postId, results };
  }
);
