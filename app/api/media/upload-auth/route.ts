import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getIKAuthenticationParameters } from "@/lib/imagekit";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Cap signature minting — keeps someone from brute-forcing tokens or
  // launching a DoS against ImageKit with signed requests.
  const limited = enforceRateLimit(`media-auth:${userId}`, 30, 60_000);
  if (limited) return limited;

  try {
    const params = getIKAuthenticationParameters();
    return NextResponse.json(params);
  } catch (error) {
    console.error("ImageKit auth error:", error);
    return NextResponse.json(
      { error: "upload_auth_failed" },
      { status: 500 },
    );
  }
}
