import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import { eq, and, sql, ilike } from "drizzle-orm";
import { createMediaSchema, badRequest } from "@/lib/validation";
import { ensureUserFromClerk } from "@/lib/users";
import { inngest } from "@/lib/inngest/client";
import { getIK } from "@/lib/imagekit";

export const dynamic = "force-dynamic";

const STORAGE_LIMITS: Record<string, number> = {
  free: 500 * 1024 * 1024,
  pro: 10 * 1024 * 1024 * 1024,
  business: 100 * 1024 * 1024 * 1024,
};

const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");

    const conditions = [eq(mediaAssets.userId, user.id)];
    if (search) conditions.push(ilike(mediaAssets.name, `%${search}%`));
    if (type) conditions.push(eq(mediaAssets.fileType, type));
    const whereClause = and(...conditions);

    const assets = await db.query.mediaAssets.findMany({
      where: whereClause,
      orderBy: (assets, { desc }) => [desc(assets.createdAt)],
    });

    const usageResult = await db
      .select({ total: sql<number>`sum(${mediaAssets.size})` })
      .from(mediaAssets)
      .where(eq(mediaAssets.userId, user.id));

    const currentUsage = Number(usageResult[0]?.total || 0);
    const limit = STORAGE_LIMITS[user.subscriptionPlan || "free"] || STORAGE_LIMITS.free;

    return NextResponse.json({
      assets,
      usage: {
        used: currentUsage,
        limit,
        percentage: Math.min(Math.round((currentUsage / limit) * 100), 100),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: "media_fetch_failed", message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const raw = await req.json();
    const parsed = createMediaSchema.safeParse(raw);
    if (!parsed.success) return badRequest(parsed.error);
    const { imageKitFileId } = parsed.data;

    // Deduplication check: prevent claiming a file ID already attached to another asset
    const existingAsset = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.imageKitFileId, imageKitFileId),
    });

    if (existingAsset) {
      return NextResponse.json(
        { error: "file_already_exists", message: "This file has already been registered." },
        { status: 400 },
      );
    }

    const ik = getIK();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fileDetails: any;
    try {
      fileDetails = await ik.getFileDetails(imageKitFileId);
    } catch (err) {
      console.error("ImageKit getFileDetails failed:", err);
      return NextResponse.json(
        { error: "imagekit_lookup_failed", message: "Unable to verify uploaded file with ImageKit." },
        { status: 502 },
      );
    }

    if (!fileDetails || typeof fileDetails !== "object") {
      return NextResponse.json(
        { error: "imagekit_file_not_found" },
        { status: 404 },
      );
    }

    // Verify folder path isolation
    const expectedFolderPrefix = `/users/${user.id}`;
    const filePath = String(fileDetails.filePath ?? "");
    if (!filePath.startsWith(expectedFolderPrefix)) {
      ik.deleteFile(imageKitFileId).catch(() => {});
      return NextResponse.json(
        { error: "unauthorized_file_path", message: "File does not belong to your user directory." },
        { status: 403 },
      );
    }

    const verifiedSize = Number(fileDetails.size ?? 0);
    const verifiedUrl = String(fileDetails.url ?? "");
    const verifiedName = fileDetails.name ?? null;
    const verifiedThumbnail = fileDetails.thumbnail ?? null;
    const verifiedMime = fileDetails.mime ?? null;
    const verifiedKind = fileDetails.fileType === "non-image" ? "video" : "image";

    if (!verifiedUrl || !Number.isFinite(verifiedSize) || verifiedSize <= 0) {
      return NextResponse.json(
        { error: "imagekit_invalid_metadata" },
        { status: 502 },
      );
    }

    if (verifiedSize > MAX_SINGLE_FILE_BYTES) {
      ik.deleteFile(imageKitFileId).catch(() => {});
      return NextResponse.json(
        { error: "file_too_large", message: "Individual file size exceeds maximum 10 MB limit." },
        { status: 400 },
      );
    }

    const plan = user.subscriptionPlan || "free";
    const limit = STORAGE_LIMITS[plan] || STORAGE_LIMITS.free;

    const usageResult = await db
      .select({ total: sql<number>`sum(${mediaAssets.size})` })
      .from(mediaAssets)
      .where(eq(mediaAssets.userId, user.id));

    const currentUsage = Number(usageResult[0]?.total || 0);

    if (currentUsage + verifiedSize > limit) {
      ik.deleteFile(imageKitFileId).catch(() => {});
      return NextResponse.json(
        { error: "storage_limit_reached", message: "Storage limit reached. Please upgrade your plan.", upgradeRequired: true },
        { status: 403 },
      );
    }

    const [newAsset] = await db
      .insert(mediaAssets)
      .values({
        userId: user.id,
        url: verifiedUrl,
        imageKitFileId,
        thumbnailUrl: verifiedThumbnail,
        name: verifiedName,
        size: verifiedSize,
        mimeType: verifiedMime,
        fileType: verifiedKind,
      } as typeof mediaAssets.$inferInsert)
      .returning();

    if (verifiedKind === "image") {
      await inngest.send({
        name: "media/alt-text.generate",
        data: { assetId: newAsset.id, url: verifiedUrl },
      });
    }

    return NextResponse.json(newAsset);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("Failed to save media asset:", error);
    return NextResponse.json({ error: "media_save_failed", message }, { status: 500 });
  }
}
