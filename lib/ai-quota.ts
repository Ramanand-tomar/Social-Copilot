import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
}

/**
 * Atomically consume one unit of the user's monthly AI quota. Resets the
 * rolling window if the previous period is older than 30 days.
 *
 * Returns `allowed: false` if the quota is exhausted. Otherwise increments
 * `totalAiCaptions` by one and returns the new count.
 */
export async function checkAiQuota(userId: string, limit: number): Promise<QuotaResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - PERIOD_MS);

  return await db.transaction(async (tx) => {
    // Reset the counter if the current period is older than the window.
    await tx
      .update(users)
      .set({ totalAiCaptions: 0, aiCaptionsPeriodStart: now })
      .where(and(eq(users.id, userId), lt(users.aiCaptionsPeriodStart, windowStart)));

    const [current] = await tx
      .select({ used: users.totalAiCaptions })
      .from(users)
      .where(eq(users.id, userId));

    const used = current?.used ?? 0;
    return { allowed: used < limit, used, limit };
  });
}

export async function recordAiUsage(userId: string, limit: number): Promise<QuotaResult> {
  return await db.transaction(async (tx) => {
    const incremented = await tx
      .update(users)
      .set({ totalAiCaptions: sql`${users.totalAiCaptions} + 1` })
      .where(and(eq(users.id, userId), lt(users.totalAiCaptions, limit)))
      .returning({ used: users.totalAiCaptions });

    const used = incremented[0]?.used ?? limit;
    return { allowed: true, used, limit };
  });
}

export const consumeAiQuota = recordAiUsage;
