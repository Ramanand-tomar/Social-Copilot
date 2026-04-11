import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getIK } from "@/lib/imagekit";
import { ensureUserFromClerk } from "@/lib/users";

export const dynamic = "force-dynamic";

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

    // 1. Get asset details to get ImageKit fileId
    const asset = await db.query.mediaAssets.findFirst({
      where: and(eq(mediaAssets.id, id), eq(mediaAssets.userId, user.id)),
    });

    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    // 2. Delete from ImageKit
    const ik = getIK();
    await ik.deleteFile(asset.imageKitFileId);

    // 3. Delete from DB
    await db.delete(mediaAssets)
      .where(and(eq(mediaAssets.id, id), eq(mediaAssets.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete media asset:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
