import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateSocialCaptions, aiWritePost } from "@/lib/gemini";
import { getPlanLimits } from "@/lib/plan-limits";
import { aiGenerateSchema, badRequest } from "@/lib/validation";
import { consumeAiQuota } from "@/lib/ai-quota";
import { ensureUserFromClerk } from "@/lib/users";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Protect Gemini billing and the DB from runaway automation scripts.
  // Quota still applies on top of this — this is the per-minute burst cap.
  const limited = enforceRateLimit(`ai:${clerkId}`, 10, 60_000);
  if (limited) return limited;

  try {
    const user = await ensureUserFromClerk(clerkId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const raw = await req.json();
    const parsed = aiGenerateSchema.safeParse(raw);
    if (!parsed.success) return badRequest(parsed.error);
    const data = parsed.data;

    const limits = getPlanLimits(user.subscriptionPlan);
    const quota = await consumeAiQuota(user.id, limits.aiCaptionsPerMonth);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "limit_reached",
          limitName: "AI Generations",
          message: `Your ${user.subscriptionPlan} plan allows ${limits.aiCaptionsPerMonth} AI generations per month.`,
        },
        { status: 403 },
      );
    }

    if (data.type === "write") {
      const content = await aiWritePost(data.prompt, data.maxChars);
      return NextResponse.json({ content });
    }

    const captions = await generateSocialCaptions(data.topic, data.platforms);
    return NextResponse.json({ captions });
  } catch (error) {
    console.error("AI Generation failed:", error);
    // Never leak raw errors — keep stacks on the server only.
    return NextResponse.json(
      { error: "ai_generation_failed", message: "We couldn't generate that right now. Please try again." },
      { status: 500 },
    );
  }
}
