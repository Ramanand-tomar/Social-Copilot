import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getIK } from "@/lib/imagekit";

export const dynamic = "force-dynamic";

async function probeWithTimeout<T>(fn: () => Promise<T>, timeoutMs = 2000): Promise<boolean> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeoutMs)
    );
    await Promise.race([fn(), timeout]);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const startedAt = Date.now();

  const dbOk = await probeWithTimeout(async () => {
    await db.execute(sql`select 1`);
  }, 2000);

  const imagekitOk = await probeWithTimeout(async () => {
    if (!process.env.IMAGEKIT_PRIVATE_KEY || !process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY) {
      throw new Error("Missing ImageKit keys");
    }
    // Real API reachability check: list files with limit=1
    await getIK().listFiles({ limit: 1 });
  }, 2000);

  const inngestOk = await probeWithTimeout(async () => {
    const signingKey = process.env.INNGEST_SIGNING_KEY;
    const eventKey = process.env.INNGEST_EVENT_KEY;
    if (process.env.NODE_ENV === "production" && !signingKey && !eventKey) {
      throw new Error("Missing Inngest keys in production");
    }
  }, 2000);

  const allOk = dbOk && imagekitOk && inngestOk;

  const body = {
    ok: allOk,
    uptime: process.uptime?.() ?? null,
    db: dbOk,
    imagekit: imagekitOk,
    inngest: inngestOk,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  };

  return NextResponse.json(body, {
    status: allOk ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
