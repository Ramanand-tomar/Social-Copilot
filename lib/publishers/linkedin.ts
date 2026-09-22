import { PublishAccount, PublishPost, PublishResult } from "./types";
import { decrypt } from "@/lib/encryption";

export async function publishToLinkedIn(
  account: PublishAccount,
  post: PublishPost,
): Promise<PublishResult> {
  if (!account.accessToken) {
    throw new Error("Missing access token for LinkedIn account");
  }

  const token = decrypt(account.accessToken);
  const authorUrn = `urn:li:person:${account.platformAccountId}`;

  const payload = {
    author: authorUrn,
    commentary: post.content,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`LinkedIn API error (${res.status}): ${errorBody}`);
  }

  const postId = res.headers.get("x-restli-id") || `linkedin_${Date.now()}`;
  return { externalPostId: postId };
}
