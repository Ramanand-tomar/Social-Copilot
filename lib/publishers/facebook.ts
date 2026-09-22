import { PublishAccount, PublishPost, PublishResult } from "./types";
import { decrypt } from "@/lib/encryption";

export async function publishToFacebook(
  account: PublishAccount,
  post: PublishPost,
): Promise<PublishResult> {
  if (!account.accessToken) {
    throw new Error("Missing access token for Facebook account");
  }

  const token = decrypt(account.accessToken);
  const pageId = account.platformAccountId;

  const url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
  const bodyData: Record<string, string> = {
    message: post.content,
    access_token: token,
  };

  if (post.mediaUrls.length > 0 && post.mediaUrls[0]) {
    bodyData.link = post.mediaUrls[0];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyData),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Facebook API error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    throw new Error("Facebook API returned response without post ID");
  }

  return { externalPostId: data.id };
}
