import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Lightweight liveness + DB check for uptime monitoring. Intentionally does
// NOT touch any external API — we don't want upstream flakiness to page us.
export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  let dbLatencyMs: number | null = null;

  try {
    const dbStart = Date.now();
    await db.execute(sql`select 1`);
    dbLatencyMs = Date.now() - dbStart;
    dbOk = true;
  } catch (error) {
    console.error("[health] db probe failed:", error);
  }

  const body = {
    ok: dbOk,
    uptime: process.uptime?.() ?? null,
    db: { ok: dbOk, latencyMs: dbLatencyMs },
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  };

  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
