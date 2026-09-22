import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { autoReplyLogs, autoReplyRules } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { ensureUserFromClerk } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const rawLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.max(1, Math.min(Number.isNaN(rawLimit) ? 50 : rawLimit, 100));

    const userRules = await db
      .select({ id: autoReplyRules.id })
      .from(autoReplyRules)
      .where(eq(autoReplyRules.userId, user.id));

    if (userRules.length === 0) {
      return NextResponse.json({ logs: [], total: 0 });
    }

    const ruleIds = userRules.map((r) => r.id);
    const logs = await db.query.autoReplyLogs.findMany({
      where: inArray(autoReplyLogs.ruleId, ruleIds),
      orderBy: [desc(autoReplyLogs.createdAt)],
      limit,
      with: {
        rule: true,
      },
    });

    return NextResponse.json({ logs, total: logs.length });
  } catch (error: unknown) {
    console.error("Fetch auto-reply logs error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
