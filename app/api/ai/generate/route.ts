import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateSocialCaptions, aiWritePost } from "@/lib/gemini";
import { getPlanLimits } from "@/lib/plan-limits";
import { aiGenerateSchema, badRequest } from "@/lib/validation";
import { checkAiQuota, recordAiUsage } from "@/lib/ai-quota";
import { ensureUserFromClerk } from "@/lib/users";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
    const quota = await checkAiQuota(user.id, limits.aiCaptionsPerMonth);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "limit_reached",
          limitName: "AI Generations",
          message: `Your ${user.subscriptionPlan} plan allows ${limits.aiCaptionsPerMonth} AI generations per month.`,
          upgradeRequired: true,
        },
        { status: 403 },
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error(JSON.stringify({ level: "error", route: "ai/generate", userId: user.id, errName: "ai_misconfigured", message: "GEMINI_API_KEY missing" }));
      return NextResponse.json(
        { error: "ai_misconfigured", message: "AI caption service is not properly configured." },
        { status: 500 },
      );
    }

    let resultPayload: any;
    if (data.type === "write") {
      const content = await aiWritePost(data.prompt, data.maxChars);
      resultPayload = { content };
    } else {
      const captions = await generateSocialCaptions(data.topic, data.platforms);
      resultPayload = { captions };
    }

    await recordAiUsage(user.id, limits.aiCaptionsPerMonth);
    return NextResponse.json(resultPayload);
  } catch (error: any) {
    const errStr = String(error?.message || error);
    console.error(JSON.stringify({
      level: "error",
      route: "ai/generate",
      errName: error?.name || "Error",
      message: errStr,
    }));

    if (errStr.includes("429") || errStr.toLowerCase().includes("rate limit")) {
      return NextResponse.json(
        { error: "ai_rate_limited", message: "AI service rate limit reached. Please wait a moment and try again." },
        { status: 429 },
      );
    }
    if (errStr.toLowerCase().includes("safety") || errStr.toLowerCase().includes("blocked")) {
      return NextResponse.json(
        { error: "ai_blocked", message: "The generated content was flagged by safety filters. Please revise your prompt." },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { error: "ai_generation_failed", message: "We couldn't generate that right now. Please try again." },
      { status: 500 },
    );
  }
}
