import { z } from "zod";
import { inngest } from "../client";
import { db } from "@/lib/db";
import { posts, socialAccounts, postPlatformResults, notifications } from "@/lib/db/schema";
import { eq, inArray, and, or, isNull, lt } from "drizzle-orm";
import { publishToPlatform } from "@/lib/publishers";

const PUBLISH_LOCK_LEASE_MS = 10 * 60 * 1000;
const TERMINAL_STATUSES = ["published", "partial", "failed"] as const;

const postPublishEventSchema = z.object({
  postId: z.string().uuid(),
  accountIds: z.array(z.string().uuid()).min(1).max(50),
  scheduleVersion: z.number().int().optional(),
});

export const postPublishFunction = inngest.createFunction(
  {
    id: "post-publish",
    retries: 3,
    concurrency: [{ key: "event.data.postId", limit: 1 }],
    cancelOn: [{ event: "app/post.publish.cancelled", match: "data.postId" }],
    triggers: [{ event: "app/post.publish" }],
  },
  async ({ event, step }) => {
    const parsed = postPublishEventSchema.safeParse(event.data);
    if (!parsed.success) {
      return { skipped: true, reason: "invalid_payload", issues: parsed.error.issues };
    }
    const { postId, accountIds, scheduleVersion } = parsed.data;

    // 1. Fetch Post
    const postData = await step.run("fetch-post-data", async () => {
      const p = await db.query.posts.findFirst({
        where: eq(posts.id, postId),
      });
      if (!p) return null;
      return p;
    });

    if (!postData) {
      return { skipped: true, reason: "post_not_found" };
    }

    // 2. Draft / Cancelled Guard
    if (postData.status === "draft") {
      return { skipped: true, reason: "post_is_draft" };
    }

    // 3. Schedule Version Check
    if (scheduleVersion !== undefined && postData.scheduleVersion !== scheduleVersion) {
      console.log(
        `Version mismatch for post ${postId}. DB: ${postData.scheduleVersion}, Event: ${scheduleVersion}. Skipping old job.`
      );
      return { skipped: true, reason: "superseded_version" };
    }

    // 4. Terminal status check
    if (TERMINAL_STATUSES.includes(postData.status as (typeof TERMINAL_STATUSES)[number])) {
      console.log(`Post ${postId} already in terminal status "${postData.status}". Skipping.`);
      return { skipped: true, reason: "already_terminal", status: postData.status };
    }

    // 5. Acquire lock
    const leaseCutoff = new Date(Date.now() - PUBLISH_LOCK_LEASE_MS);
    const lockResult = await step.run("acquire-publish-lock", async () => {
      const locked = await db
        .update(posts)
        .set({ publishLockAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(posts.id, postId),
            inArray(posts.status, ["queued", "scheduled", "posting"]),
            or(isNull(posts.publishLockAt), lt(posts.publishLockAt, leaseCutoff)),
          ),
        )
        .returning({ id: posts.id });
      return locked.length > 0;
    });

    if (!lockResult) {
      return { skipped: true, reason: "lock_unavailable" };
    }

    // 6. Fetch target accounts
    const accounts = await step.run("fetch-target-accounts", async () => {
      if (!Array.isArray(accountIds) || accountIds.length === 0) return [];
      return await db.query.socialAccounts.findMany({
        where: and(
          inArray(socialAccounts.id, accountIds),
          eq(socialAccounts.userId, postData.userId),
        ),
      });
    });

    // 7. Publish to each platform
    const results: Array<{ platform: string; status: string; errorMessage?: string }> = [];
    for (const account of accounts) {
      const platformResult = await step.run(`publish-${account.platform}-${account.id}`, async () => {
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
            errorMessage: existing.errorMessage ?? undefined,
          };
        }

        try {
          const res = await publishToPlatform(
            {
              id: account.id,
              platform: account.platform,
              platformAccountId: account.platformAccountId,
              accessToken: account.accessToken,
              refreshToken: account.refreshToken,
            },
            {
              id: postData.id,
              content: postData.content,
              mediaUrls: (postData.mediaUrls as string[]) || [],
            },
          );

          await db.insert(postPlatformResults).values({
            postId,
            socialAccountId: account.id,
            status: "success",
            externalPostId: res.externalPostId,
          });

          return { platform: account.platform, status: "success" };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Failed to publish to ${account.platform}:`, message);

          await db.insert(postPlatformResults).values({
            postId,
            socialAccountId: account.id,
            status: "failed",
            errorMessage: message,
          });

          return { platform: account.platform, status: "failed", errorMessage: message };
        }
      });
      results.push(platformResult);
    }

    // 8. Update post status & notify if partial/failed
    await step.run("update-post-status-and-notify", async () => {
      const allSuccess = results.length > 0 && results.every((r) => r.status === "success");
      const someSuccess = results.some((r) => r.status === "success");
      const finalStatus = allSuccess ? "published" : someSuccess ? "partial" : "failed";

      await db
        .update(posts)
        .set({
          status: finalStatus,
          publishLockAt: null,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId));

      if (finalStatus === "partial" || finalStatus === "failed") {
        const failedPlatforms = results
          .filter((r) => r.status === "failed")
          .map((r) => `${r.platform}: ${r.errorMessage || "Unknown error"}`)
          .join("; ");

        await db.insert(notifications).values({
          userId: postData.userId,
          kind: `publish.${finalStatus}`,
          title: finalStatus === "partial" ? "Post Partially Published" : "Post Publishing Failed",
          body: `Publishing for post "${postData.content.slice(0, 40)}..." failed on: ${failedPlatforms}`,
          data: { postId, results },
        });
      }
    });

    return { postId, results };
  }
);
