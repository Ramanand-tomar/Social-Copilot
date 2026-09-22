import { z } from "zod";
import { NextResponse } from "next/server";

const uuid = z.string().uuid();
const nonEmpty = z.string().min(1).max(10_000);

// ---------- Posts ----------

const postStatus = z.enum(["draft", "scheduled", "queued", "posted", "published", "failed", "partial"]);

// A scheduled datetime sent by the client. Must be a valid ISO string.
const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: "Invalid ISO date" });

// IANA timezone identifier, validated against the runtime's tz database.
const ianaTimezone = z
  .string()
  .max(100)
  .refine(
    (tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid IANA timezone" },
  );

export const createPostSchema = z
  .object({
    content: z.string().max(10_000).optional().default(""),
    mediaUrls: z.array(z.string().url()).max(10).optional().default([]),
    accountIds: z.array(uuid).max(50).optional().default([]),
    scheduledAt: isoDate.nullable().optional(),
    scheduledTimezone: ianaTimezone.nullable().optional(),
    status: postStatus.optional().default("draft"),
    intent: z.enum(["draft", "publish_now", "schedule"]).optional(),
  })
  .refine(
    (data) => {
      if (data.intent === "draft" || data.status === "draft") return true;
      return (data.accountIds?.length ?? 0) >= 1;
    },
    {
      message: "At least one social account must be selected to publish or schedule",
      path: ["accountIds"],
    },
  )
  .refine(
    (data) => {
      if (data.intent === "draft" || data.status === "draft") return true;
      return (data.content?.length ?? 0) > 0 || (data.mediaUrls?.length ?? 0) > 0;
    },
    {
      message: "Post must have either content or media to publish or schedule",
      path: ["content"],
    },
  );

export const updatePostSchema = z.object({
  content: z.string().max(10_000).optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  accountIds: z.array(uuid).max(50).optional(),
  // null clears the schedule, undefined leaves it alone, string reschedules.
  scheduledAt: isoDate.nullable().optional(),
  scheduledTimezone: ianaTimezone.nullable().optional(),
  status: postStatus.optional(),
  intent: z.enum(["draft", "publish_now", "schedule"]).optional(),
});

export const listPostsQuerySchema = z.object({
  start: isoDate.optional(),
  end: isoDate.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ---------- Media ----------

// Only `imageKitFileId` is trusted from the client. The server resolves
// `size`, `mimeType`, `url`, `thumbnailUrl`, and `name` against the
// ImageKit Media API so a malicious client can't underreport bytes to
// dodge the storage quota. The other fields stay accepted for backward
// compatibility but are ignored on the server.
export const createMediaSchema = z.object({
  imageKitFileId: nonEmpty,
});

// ---------- Auto-reply rules ----------

export const createAutoReplyRuleSchema = z
  .object({
    name: z.string().min(1).max(200),
    triggerType: z.enum(["keywords", "all"]).default("keywords"),
    keywords: z.array(z.string().min(1).max(200)).max(50).optional().default([]),
    isAi: z.boolean().default(false),
    aiPrompt: z.string().max(4000).nullable().optional(),
    responseContent: z.string().max(4000).nullable().optional(),
    selectedAccounts: z.array(uuid).max(100).default([]),
  })
  .refine(
    (rule) =>
      rule.isAi ? !!rule.aiPrompt : !!rule.responseContent,
    {
      message: "AI rules need aiPrompt; template rules need responseContent",
      path: ["responseContent"],
    },
  )
  .refine(
    (rule) => rule.triggerType !== "keywords" || (rule.keywords?.length ?? 0) > 0,
    { message: "Keyword rules need at least one keyword", path: ["keywords"] },
  );

export const updateAutoReplyRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  triggerType: z.enum(["keywords", "all"]).optional(),
  keywords: z.array(z.string().min(1).max(200)).max(50).optional(),
  isAi: z.boolean().optional(),
  aiPrompt: z.string().max(4000).nullable().optional(),
  responseContent: z.string().max(4000).nullable().optional(),
  selectedAccounts: z.array(uuid).max(100).optional(),
  isActive: z.boolean().optional(),
});

// ---------- AI generate ----------

export const aiGenerateSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("write"),
    prompt: z.string().min(1).max(2000),
    maxChars: z.number().int().min(50).max(10_000).optional(),
  }),
  z.object({
    type: z.literal("captions").optional(),
    topic: z.string().min(1).max(500),
    platforms: z.array(z.string()).min(1).max(20),
  }),
]);

// ---------- Helpers ----------

export function badRequest(error: z.ZodError): NextResponse {
  return NextResponse.json(
    { error: "validation_error", issues: error.issues },
    { status: 400 },
  );
}
