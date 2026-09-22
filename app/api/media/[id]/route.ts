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
  if (!clerkId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const asset = await db.query.mediaAssets.findFirst({
      where: and(eq(mediaAssets.id, id), eq(mediaAssets.userId, user.id)),
    });

    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const ik = getIK();
    try {
      await ik.deleteFile(asset.imageKitFileId);
    } catch (ikErr) {
      console.warn("ImageKit deleteFile warning (proceeding with DB deletion):", ikErr);
    }

    await db
      .delete(mediaAssets)
      .where(and(eq(mediaAssets.id, id), eq(mediaAssets.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("Failed to delete media asset:", error);
    return NextResponse.json({ error: "media_delete_failed", message }, { status: 500 });
  }
}
