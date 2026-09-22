import { PublishAccount, PublishPost, PublishResult } from "./types";
import { publishToX } from "./x";
import { publishToLinkedIn } from "./linkedin";
import { publishToInstagram } from "./instagram";
import { publishToFacebook } from "./facebook";

export * from "./types";

const SUPPORTED_PUBLISHER_PLATFORMS = new Set<string>([
  "twitter",
  "linkedin",
  "instagram",
  "facebook",
]);

export function isPlatformPublishable(platform: string): boolean {
  return SUPPORTED_PUBLISHER_PLATFORMS.has(platform.toLowerCase());
}

export async function publishToPlatform(
  account: PublishAccount,
  post: PublishPost,
): Promise<PublishResult> {
  const platform = account.platform.toLowerCase();

  switch (platform) {
    case "twitter":
    case "x":
      return await publishToX(account, post);
    case "linkedin":
      return await publishToLinkedIn(account, post);
    case "instagram":
      return await publishToInstagram(account, post);
    case "facebook":
      return await publishToFacebook(account, post);
    default:
      throw new Error(`Publishing to platform "${platform}" is not supported`);
  }
}
