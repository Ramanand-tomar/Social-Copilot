import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { inngest } from "@/lib/inngest/client";
import { requireEnv, optionalEnv } from "@/lib/env";
import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";

// This is a generic webhook receiver that normalizes comment events
// from various social platforms to trigger our auto-reply worker.

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
  const expected = "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
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

    if (!verified) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const body = parsed as Record<string, string | undefined>;

    // Normalize logic for different platforms
    let normalizedEvent: {
      platform: string;
      accountId?: string;
      postId?: string;
      commentId?: string;
      commentText?: string;
      commenterHandle?: string;
    };

    if (platform === "instagram") {
      normalizedEvent = {
        platform: "instagram",
        accountId: body.accountId,
        postId: body.postId,
        commentId: body.commentId,
        commentText: body.text,
        commenterHandle: body.username,
      };
    } else if (platform === "twitter" || platform === "x") {
      normalizedEvent = {
        platform: "twitter",
        accountId: body.accountId,
        postId: body.tweet_id,
        commentId: body.reply_id,
        commentText: body.text,
        commenterHandle: body.user_handle,
      };
    } else {
      normalizedEvent = {
        platform: body.platform || "generic",
        accountId: body.accountId,
        postId: body.postId,
        commentId: body.commentId,
        commentText: body.commentText || body.text,
        commenterHandle: body.commenterHandle || body.username,
      };
    }

    if (!normalizedEvent.accountId || !normalizedEvent.commentId) {
      return NextResponse.json({ error: "Invalid payload: missing accountId or commentId" }, { status: 400 });
    }

    // Replay protection: commentId is the provider-unique event id. We
    // insert into `webhook_events` first and rely on the unique (provider,
    // external_event_id) index to swallow duplicates. Any unique-violation
    // means we've already seen this event and processed it.
    try {
      await db.insert(webhookEvents).values({
        provider: normalizedEvent.platform,
        externalEventId: normalizedEvent.commentId,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        return NextResponse.json({ success: true, deduped: true });
      }
      throw err;
    }

    await inngest.send({
      name: "social/comment.received",
      data: normalizedEvent,
    });

    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (error: any) {
    console.error("Webhook receiver error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Support for Instagram/Facebook verification challenge
export async function GET(req: NextRequest) {
  const verifyToken = requireEnv("WEBHOOK_VERIFY_TOKEN");
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
