import { z } from "zod";
import { inngest } from "../client";
import { db } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getGemini, getModelName } from "@/lib/gemini";

const mediaAltTextEventSchema = z.object({
  assetId: z.string().uuid(),
  url: z.string().url(),
});

// Only fetch images from hosts we explicitly trust. Anything else (including
// localhost, private ranges, and cloud metadata services) is blocked.
const ALLOWED_IMAGE_HOSTS = new Set<string>([
  "ik.imagekit.io",
]);

function isSafeImageUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) return false;
  return true;
}

export const mediaAltTextFunction = inngest.createFunction(
  {
    id: "media-alt-text",
    retries: 2,
    concurrency: [{ key: "event.data.assetId", limit: 1 }],
    triggers: [{ event: "media/alt-text.generate" }],
  },
  async ({ event, step }) => {
    const parsed = mediaAltTextEventSchema.safeParse(event.data);
    if (!parsed.success) {
      return { skipped: true, reason: "invalid_payload", issues: parsed.error.issues };
    }
    const { assetId, url } = parsed.data;

    if (!isSafeImageUrl(url)) {
      console.warn(`[media-alt-text] Refusing to fetch untrusted URL: ${url}`);
      return { skipped: true, reason: "untrusted_url" };
    }

    // Pull the image bytes and hand them to Gemini in one step so Inngest
    // treats the external call as an idempotent unit.
    const altText = await step.run("generate-alt-text", async () => {
      const model = getGemini().getGenerativeModel({ model: getModelName() });
      const prompt =
        "Describe this image in detail for an accessibility alt text. Be concise but descriptive. Only return the description text.";

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const buffer = await response.arrayBuffer();

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: Buffer.from(buffer).toString("base64"),
            mimeType: contentType,
          },
        },
      ]);

      return result.response.text().trim();
    });

    await step.run("update-asset", async () => {
      await db
        .update(mediaAssets)
        .set({ altText, updatedAt: new Date() })
        .where(eq(mediaAssets.id, assetId));
    });

    return { assetId, altText };
  }
);
