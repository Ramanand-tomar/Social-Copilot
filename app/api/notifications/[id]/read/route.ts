import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureUserFromClerk } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const notificationId = (await params).id;

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Mark notification read error:", error);
    return NextResponse.json({ error: "Failed to mark notification read" }, { status: 500 });
  }
}
