import { PublishAccount, PublishPost, PublishResult } from "./types";
import { decrypt } from "@/lib/encryption";

export async function publishToX(
  account: PublishAccount,
  post: PublishPost,
): Promise<PublishResult> {
  if (!account.accessToken) {
    throw new Error("Missing access token for X account");
  }

  const token = decrypt(account.accessToken);

  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: post.content }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`X API error (${res.status}): ${errorBody}`);
  }

  const data = (await res.json()) as { data?: { id?: string } };
  const tweetId = data.data?.id;

  if (!tweetId) {
    throw new Error("X API returned response without tweet ID");
  }

  return { externalPostId: tweetId };
}
