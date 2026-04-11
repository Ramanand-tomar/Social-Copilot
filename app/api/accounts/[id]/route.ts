import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { refreshAccountToken } from "@/lib/token-refresh";
import { ensureUserFromClerk } from "@/lib/users";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = (await params).id;

  try {
    const user = await ensureUserFromClerk(clerkId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const deleted = await db
      .delete(socialAccounts)
      .where(and(eq(socialAccounts.id, accountId), eq(socialAccounts.userId, user.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Account Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = (await params).id;

  try {
    const user = await ensureUserFromClerk(clerkId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const account = await db.query.socialAccounts.findFirst({
      where: and(eq(socialAccounts.id, accountId), eq(socialAccounts.userId, user.id)),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const result = await refreshAccountToken(account);
    if (result.status !== "success") {
      return NextResponse.json(
        { success: false, status: result.status, error: result.error ?? null },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Refresh Account Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
