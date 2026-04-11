import { Inngest } from "inngest";

// `signingKey` and `eventKey` are auto-loaded from `INNGEST_SIGNING_KEY` /
// `INNGEST_EVENT_KEY` by the SDK. We pass them here explicitly so the
// config is visible in one place and any typo in env names fails loud.
export const inngest = new Inngest({
  id: "social-copilot",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
