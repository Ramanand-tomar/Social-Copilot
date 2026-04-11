import { inngest } from "../client";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { lt, and, isNotNull, eq } from "drizzle-orm";
import { refreshAccountToken } from "@/lib/token-refresh";

export const refreshTokenFunction = inngest.createFunction(
  {
    id: "refresh-tokens",
    // Only one instance of the hourly sweep at a time — otherwise overlapping
    // retries can each pick up the same account and clobber each other.
    concurrency: [{ key: "event.name", limit: 1 }],
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    // Find IDs of tokens expiring within the next 2 hours. We deliberately
    // return just the ids so the step's JSON round-trip doesn't stringify
    // Date fields before we hand the row to refreshAccountToken.
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const expiringIds = await step.run("fetch-expiring-accounts", async () => {
      const rows = await db
        .select({ id: socialAccounts.id })
        .from(socialAccounts)
        .where(
          and(
            isNotNull(socialAccounts.expiresAt),
            lt(socialAccounts.expiresAt, soon),
          ),
        );
      return rows.map((r) => r.id);
    });

    const results: Awaited<ReturnType<typeof refreshAccountToken>>[] = [];

    for (const accountId of expiringIds) {
      const result = await step.run(`refresh-${accountId}`, async () => {
        const account = await db.query.socialAccounts.findFirst({
          where: eq(socialAccounts.id, accountId),
        });
        if (!account) {
          return { accountId, status: "no_refresh_token" as const };
        }
        return await refreshAccountToken(account);
      });
      results.push(result);
    }

    return { refreshed: results.length, results };
  }
);
