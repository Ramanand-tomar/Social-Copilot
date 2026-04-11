import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { autoReplyRules } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateAutoReplyRuleSchema, badRequest } from "@/lib/validation";
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
    const parsed = updateAutoReplyRuleSchema.safeParse(raw);
    if (!parsed.success) return badRequest(parsed.error);
    const data = parsed.data;

    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Only update fields the caller actually sent.
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) updateSet[k] = v;
    }

    const [updatedRule] = await db.update(autoReplyRules)
      .set(updateSet)
      .where(and(eq(autoReplyRules.id, id), eq(autoReplyRules.userId, user.id)))
      .returning();

    if (!updatedRule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

    return NextResponse.json(updatedRule);
  } catch (error: any) {
    console.error("Failed to update auto-reply rule:", error);
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

    const [deletedRule] = await db.delete(autoReplyRules)
      .where(and(eq(autoReplyRules.id, id), eq(autoReplyRules.userId, user.id)))
      .returning();

    if (!deletedRule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete auto-reply rule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
