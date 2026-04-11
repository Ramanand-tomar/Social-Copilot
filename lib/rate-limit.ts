// Simple in-memory sliding-window rate limiter. Good enough for a single
// Next.js instance; swap the backend for Upstash/Redis when you go multi-
// region without touching callers.

import { NextResponse } from "next/server";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  windowStart: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

// Periodically purge expired buckets so memory doesn't grow forever under
// a stream of one-off keys.
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function startCleanup() {
  if (cleanupTimer || typeof setInterval !== "function") return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart > 10 * 60_000) buckets.delete(key);
    }
  }, 60_000);
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    (cleanupTimer as { unref?: () => void }).unref?.();
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  startCleanup();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { windowStart: now, count: 1 });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  bucket.count += 1;
  const resetAt = bucket.windowStart + windowMs;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, resetAt };
  }
  return { ok: true, remaining: limit - bucket.count, resetAt };
}

/**
 * Returns a NextResponse for 429, or `null` if the request is under limit.
 * Usage:
 *     const limited = enforceRateLimit(`ai:${user.id}`, 10, 60_000);
 *     if (limited) return limited;
 */
export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const result = checkRateLimit(key, limit, windowMs);
  if (result.ok) return null;

  const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: "rate_limited",
      message: "Too many requests. Please slow down.",
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
      },
    },
  );
}
