import { PublishAccount, PublishPost, PublishResult } from "./types";
import { decrypt } from "@/lib/encryption";

export async function publishToInstagram(
  account: PublishAccount,
  post: PublishPost,
): Promise<PublishResult> {
  if (!account.accessToken) {
    throw new Error("Missing access token for Instagram account");
  }

  const token = decrypt(account.accessToken);
  const igUserId = account.platformAccountId;
  const imageUrl = post.mediaUrls[0];

  if (!imageUrl) {
    throw new Error("Instagram post requires an image URL");
  }

  // 1. Create Media Container
  const containerUrl = `https://graph.instagram.com/v19.0/${igUserId}/media`;
  const containerRes = await fetch(containerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: post.content,
      access_token: token,
    }),
  });

  if (!containerRes.ok) {
    const errorText = await containerRes.text();
    throw new Error(`Instagram container creation failed (${containerRes.status}): ${errorText}`);
  }

  const containerData = (await containerRes.json()) as { id?: string };
  const creationId = containerData.id;

  if (!creationId) {
    throw new Error("Instagram API returned container without ID");
  }

  // 2. Publish Container
  const publishUrl = `https://graph.instagram.com/v19.0/${igUserId}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: token,
    }),
  });

  if (!publishRes.ok) {
    const errorText = await publishRes.text();
    throw new Error(`Instagram media publish failed (${publishRes.status}): ${errorText}`);
  }

  const publishData = (await publishRes.json()) as { id?: string };
  const mediaId = publishData.id || creationId;

  return { externalPostId: mediaId };
}
