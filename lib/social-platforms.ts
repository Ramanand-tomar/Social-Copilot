export type Platform =
  | "instagram"
  | "youtube"
  | "tiktok"
  | "facebook"
  | "linkedin"
  | "pinterest"
  | "discord"
  | "twitter"
  | "slack";

export interface PlatformConfig {
  id: Platform;
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientId?: string;
  clientSecret?: string;
  /** Max characters allowed in a post body for this platform. */
  maxContentLength: number;
}

/**
 * Given a list of platforms, return the strictest (smallest) content length.
 * Used to enforce a post limit that's safe for every selected destination.
 * Defaults to a generous fallback if called with an empty list.
 */
export function getStrictestContentLimit(platformIds: readonly Platform[]): number {
  if (platformIds.length === 0) return 10_000;
  let min = Number.POSITIVE_INFINITY;
  for (const id of platformIds) {
    const p = platforms[id];
    if (p && p.maxContentLength < min) min = p.maxContentLength;
  }
  return Number.isFinite(min) ? min : 10_000;
}

export function isConfigured(platformId: Platform): boolean {
  const p = platforms[platformId];
  if (!p) return false;
  const { clientId, clientSecret } = p;
  if (!clientId || !clientSecret) return false;
  if (clientId.toLowerCase().startsWith("your_") || clientSecret.toLowerCase().startsWith("your_")) {
    return false;
  }
  return true;
}

export const platforms: Record<Platform, PlatformConfig> = {
  instagram: {
    // "Instagram API with Instagram Login" — Meta's current OAuth flow for
    // Instagram Business / Creator accounts. The old Basic Display API
    // (api.instagram.com/oauth/authorize + instagram_basic scope) was
    // deprecated in Dec 2024 and now returns "Invalid platform app".
    // Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
    id: "instagram",
    name: "Instagram",
    authorizationUrl: "https://www.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scopes: [
      "instagram_business_basic",
      "instagram_business_content_publish",
      "instagram_business_manage_comments",
      "instagram_business_manage_messages",
    ],
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    maxContentLength: 2200,
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"],
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    maxContentLength: 5000,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    authorizationUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["video.upload", "video.publish", "user.info.basic"],
    clientId: process.env.TIKTOK_CLIENT_ID,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    maxContentLength: 2200,
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    authorizationUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    maxContentLength: 63206,
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["openid", "profile", "email", "w_member_social"],
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    maxContentLength: 3000,
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    authorizationUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    scopes: ["boards:read", "pins:read", "pins:write"],
    clientId: process.env.PINTEREST_CLIENT_ID,
    clientSecret: process.env.PINTEREST_CLIENT_SECRET,
    maxContentLength: 500,
  },
  discord: {
    id: "discord",
    name: "Discord",
    authorizationUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scopes: ["identify", "guilds"],
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    maxContentLength: 2000,
  },
  twitter: {
    id: "twitter",
    name: "Twitter/X",
    authorizationUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
    maxContentLength: 280,
  },
  slack: {
    id: "slack",
    name: "Slack",
    authorizationUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["incoming-webhook", "chat:write"],
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    maxContentLength: 4000,
  },
};
