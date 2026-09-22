import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
}

export async function checkAiQuota(userId: string, limit: number): Promise<QuotaResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - PERIOD_MS);

  const [current] = await db
    .select({ used: users.totalAiCaptions, periodStart: users.aiCaptionsPeriodStart })
    .from(users)
    .where(eq(users.id, userId));

  if (!current) {
    return { allowed: false, used: limit, limit };
  }

  const isPeriodExpired = current.periodStart < windowStart;
  const effectiveUsed = isPeriodExpired ? 0 : current.used;

  return { allowed: effectiveUsed < limit, used: effectiveUsed, limit };
}

export async function recordAiUsage(userId: string, limit: number): Promise<QuotaResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - PERIOD_MS);

  const updated = await db
    .update(users)
    .set({
      totalAiCaptions: sql`CASE 
        WHEN ${users.aiCaptionsPeriodStart} < ${windowStart} THEN 1 
        WHEN ${users.totalAiCaptions} < ${limit} THEN ${users.totalAiCaptions} + 1 
        ELSE ${users.totalAiCaptions} 
      END`,
      aiCaptionsPeriodStart: sql`CASE 
        WHEN ${users.aiCaptionsPeriodStart} < ${windowStart} THEN ${now} 
        ELSE ${users.aiCaptionsPeriodStart} 
      END`,
    })
    .where(and(eq(users.id, userId)))
    .returning({ used: users.totalAiCaptions });

  const used = updated[0]?.used ?? limit;
  return { allowed: used <= limit, used, limit };
}

export const consumeAiQuota = recordAiUsage;
