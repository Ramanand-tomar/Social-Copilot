import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { autoReplyRules } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { getPlanLimits } from "@/lib/plan-limits";
import { createAutoReplyRuleSchema, badRequest } from "@/lib/validation";
import { ensureUserFromClerk } from "@/lib/users";

export const dynamic = "force-dynamic";

class PlanLimitError extends Error {}

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const rules = await db.query.autoReplyRules.findMany({
      where: eq(autoReplyRules.userId, user.id),
      orderBy: (rules, { desc }) => [desc(rules.createdAt)],
    });

    return NextResponse.json({ rules });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const raw = await req.json();
    const parsed = createAutoReplyRuleSchema.safeParse(raw);
    if (!parsed.success) return badRequest(parsed.error);
    const { name, triggerType, keywords, isAi, aiPrompt, responseContent, selectedAccounts } = parsed.data;

    const newRule = await db.transaction(async (tx) => {
      const [{ value: currentCount }] = await tx
        .select({ value: count() })
        .from(autoReplyRules)
        .where(eq(autoReplyRules.userId, user.id));

      const limits = getPlanLimits(user.subscriptionPlan);
      if (currentCount >= limits.maxAutoReplyRules) {
        throw new PlanLimitError(
          `Plan limit reached. Your ${user.subscriptionPlan} plan allows max ${limits.maxAutoReplyRules} rules.`,
        );
      }

      const [created] = await tx.insert(autoReplyRules).values({
        userId: user.id,
        name,
        triggerType,
        keywords,
        isAi,
        aiPrompt: aiPrompt ?? null,
        responseContent: responseContent ?? null,
        selectedAccounts,
      }).returning();
      return created;
    });

    return NextResponse.json(newRule);
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json(
        { error: "limit_reached", limitName: "Auto-Reply Rules", message: error.message },
        { status: 403 },
      );
    }
    console.error("Failed to create auto-reply rule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
