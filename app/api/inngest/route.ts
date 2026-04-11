import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { refreshTokenFunction } from "@/lib/inngest/functions/token-refresh";
import { postPublishFunction } from "@/lib/inngest/functions/post-publish";
import { autoReplyFunction } from "@/lib/inngest/functions/auto-reply";
import { mediaAltTextFunction } from "@/lib/inngest/functions/media-alt-text";

// Inngest's serve() automatically reads INNGEST_SIGNING_KEY from the env
// and rejects unsigned POSTs with 401 once set. In production you MUST
// configure it — otherwise anyone who finds this URL can invoke these
// functions with arbitrary payloads. We warn loudly here during module
// init so that a missing key is visible in deploy logs instead of silent.
if (process.env.NODE_ENV === "production" && !process.env.INNGEST_SIGNING_KEY) {
  console.error(
    "[inngest] INNGEST_SIGNING_KEY is not set in production — the /api/inngest endpoint is NOT protected. Set it from the Inngest dashboard.",
  );
}

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    refreshTokenFunction,
    postPublishFunction,
    autoReplyFunction,
    mediaAltTextFunction,
  ],
});
