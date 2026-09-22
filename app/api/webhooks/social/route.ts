import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { inngest } from "@/lib/inngest/client";
import { optionalEnv } from "@/lib/env";
import { db } from "@/lib/db";
import { webhookEvents, socialAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = optionalEnv("META_APP_SECRET") || optionalEnv("FACEBOOK_CLIENT_SECRET");
  if (!appSecret || !signatureHeader) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyGenericHmac(rawBody: string, signatureHeader: string | null): boolean {
  const secret = optionalEnv("SOCIAL_WEBHOOK_SECRET");
  if (!secret || !signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.replace(/^sha256=/, "");
  return timingSafeEqualHex(provided, expected);
}

export async function POST(req: NextRequest) {
  try {
    const platform = req.nextUrl.searchParams.get("platform") || "unknown";
    const rawBody = await req.text();

    let verified = false;
    if (platform === "instagram" || platform === "facebook") {
      verified = verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"));
    } else {
      verified = verifyGenericHmac(
        rawBody,
        req.headers.get("x-signature-256") ?? req.headers.get("x-webhook-signature"),
      );
    }

    if (!verified && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const eventsToTrigger: Array<{
      platform: string;
      accountId: string;
      postId: string;
      commentId: string;
      commentText: string;
      commenterHandle: string;
    }> = [];

    const entryList = Array.isArray(parsed.entry) ? (parsed.entry as Array<Record<string, unknown>>) : null;
    if (entryList) {
      for (const entry of entryList) {
        const entryId = entry.id;
        const changes = Array.isArray(entry.changes) ? (entry.changes as Array<Record<string, unknown>>) : null;
        if (!entryId || !changes) continue;

        const account = await db.query.socialAccounts.findFirst({
          where: and(
            eq(socialAccounts.platformAccountId, String(entryId)),
            eq(socialAccounts.platform, platform),
          ),
        });

        if (!account) continue;

        for (const change of changes) {
          if (change.field === "comments" || change.field === "feed") {
            const val = change.value as Record<string, unknown> | undefined;
            if (!val || !val.id) continue;

            const fromObj = val.from as Record<string, unknown> | undefined;
            const mediaObj = val.media as Record<string, unknown> | undefined;

            // Skip self-comments to avoid automated infinite loops
            if (fromObj?.id && String(fromObj.id) === String(entryId)) continue;

            eventsToTrigger.push({
              platform,
              accountId: account.id,
              postId: String(mediaObj?.id || val.post_id || "post_unknown"),
              commentId: String(val.id),
              commentText: String(val.text || val.message || ""),
              commenterHandle: String(fromObj?.username || fromObj?.name || "user"),
            });
          }
        }
      }
    } else {
      // Direct flat payload structure
      const accountId = parsed.accountId ? String(parsed.accountId) : undefined;
      const commentId = parsed.commentId ? String(parsed.commentId) : undefined;
      if (accountId && commentId) {
        eventsToTrigger.push({
          platform: parsed.platform ? String(parsed.platform) : platform,
          accountId,
          postId: parsed.postId ? String(parsed.postId) : "post_unknown",
          commentId,
          commentText: String(parsed.commentText || parsed.text || ""),
          commenterHandle: String(parsed.commenterHandle || parsed.username || "user"),
        });
      }
    }

    if (eventsToTrigger.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let triggeredCount = 0;
    for (const ev of eventsToTrigger) {
      try {
        await db.insert(webhookEvents).values({
          provider: ev.platform,
          externalEventId: ev.commentId,
        });
      } catch (err: unknown) {
        if ((err as { code?: string })?.code === "23505") continue; // Deduped
        throw err;
      }

      await inngest.send({
        name: "social/comment.received",
        data: ev,
      });
      triggeredCount++;
    }

    return NextResponse.json({ success: true, triggeredCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("Webhook receiver error:", error);
    return NextResponse.json({ error: "webhook_processing_failed", message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const verifyToken = optionalEnv("WEBHOOK_VERIFY_TOKEN");
  if (!verifyToken) {
    return NextResponse.json(
      { error: "WEBHOOK_VERIFY_TOKEN is not configured on the server" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token.length === verifyToken.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(verifyToken))
  ) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
