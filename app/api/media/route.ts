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
  free: 500 * 1024 * 1024, // 500MB
  pro: 10 * 1024 * 1024 * 1024, // 10GB
  business: 100 * 1024 * 1024 * 1024, // 100GB
};

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type"); // 'image', 'video'

    let whereClause = eq(mediaAssets.userId, user.id);

    if (search || type) {
      const conditions = [eq(mediaAssets.userId, user.id)];
      if (search) conditions.push(ilike(mediaAssets.name, `%${search}%`));
      if (type) conditions.push(eq(mediaAssets.fileType, type));
      whereClause = and(...conditions) as any;
    }

    const assets = await db.query.mediaAssets.findMany({
      where: whereClause,
      orderBy: (assets, { desc }) => [desc(assets.createdAt)],
    });

    // Calculate total usage
    const usageResult = await db.select({ total: sql<number>`sum(${mediaAssets.size})` })
      .from(mediaAssets)
      .where(eq(mediaAssets.userId, user.id));
    
    const currentUsage = Number(usageResult[0]?.total || 0);
    const limit = STORAGE_LIMITS[user.subscriptionPlan || "free"] || STORAGE_LIMITS.free;

    return NextResponse.json({ 
      assets, 
      usage: {
        used: currentUsage,
        limit,
        percentage: Math.min(Math.round((currentUsage / limit) * 100), 100)
      }
    });
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
    const parsed = createMediaSchema.safeParse(raw);
    if (!parsed.success) return badRequest(parsed.error);
    const { imageKitFileId } = parsed.data;

    // Resolve provider-verified metadata from ImageKit. Trusting the
    // client for size/mime would let it underreport bytes to dodge the
    // storage quota or lie about the file type to bypass content-rule
    // checks downstream.
    const ik = getIK();
    let fileDetails;
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

    // ImageKit `getFileDetails` returns `size`, `url`, `name`, `thumbnail`,
    // `fileType` ("image" | "non-image"), and an optional `mime`.
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

    const plan = user.subscriptionPlan || "free";
    const limit = STORAGE_LIMITS[plan] || STORAGE_LIMITS.free;

    const usageResult = await db.select({ total: sql<number>`sum(${mediaAssets.size})` })
      .from(mediaAssets)
      .where(eq(mediaAssets.userId, user.id));

    const currentUsage = Number(usageResult[0]?.total || 0);

    if (currentUsage + verifiedSize > limit) {
      // Roll back the orphaned ImageKit upload so quota dodging via
      // "upload then 403" can't accumulate provider-side cost.
      ik.deleteFile(imageKitFileId).catch((err) => {
        console.error("Failed to roll back over-quota ImageKit file:", err);
      });
      return NextResponse.json(
        { error: "storage_limit_reached", message: "Storage limit reached. Please upgrade your plan." },
        { status: 403 },
      );
    }

    const [newAsset] = await db.insert(mediaAssets).values({
      userId: user.id,
      url: verifiedUrl,
      imageKitFileId,
      thumbnailUrl: verifiedThumbnail,
      name: verifiedName,
      size: verifiedSize,
      mimeType: verifiedMime,
      fileType: verifiedKind,
    }).returning();

    // Dispatch alt-text generation to Inngest. Previously this was a
    // fire-and-forget async call, which gets killed when the serverless
    // function's response completes. Inngest gives us durable execution
    // and automatic retries.
    if (verifiedKind === "image") {
      await inngest.send({
        name: "media/alt-text.generate",
        data: { assetId: newAsset.id, url: verifiedUrl },
      });
    }

    return NextResponse.json(newAsset);
  } catch (error: any) {
    console.error("Failed to save media asset:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
