import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  varchar,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  imageUrl: text("image_url"),
  subscriptionPlan: varchar("subscription_plan", { length: 20 }).default("free"),
  clerkSubscriptionId: text("clerk_subscription_id"),
  timezone: text("timezone").default("UTC").notNull(),
  totalAiCaptions: integer("total_ai_captions").default(0).notNull(),
  aiCaptionsPeriodStart: timestamp("ai_captions_period_start").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    platform: varchar("platform", { length: 50 }).notNull(),
    platformAccountId: text("platform_account_id").notNull(),
    platformUsername: text("platform_username"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("social_accounts_user_id_idx").on(t.userId),
    uniqueIndex("social_accounts_unique_per_user").on(
      t.userId,
      t.platform,
      t.platformAccountId,
    ),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    mediaUrls: jsonb("media_urls").default([]),
    scheduledAt: timestamp("scheduled_at"),
    // IANA timezone the user was in when they scheduled the post. Stored so
    // the UI can display "Publishes at 2:00 PM America/Toronto" even when
    // the viewer's browser is in a different tz.
    scheduledTimezone: text("scheduled_timezone"),
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    selectedAccounts: jsonb("selected_accounts").default([]).notNull(),
    publishLockAt: timestamp("publish_lock_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("posts_user_scheduled_idx").on(t.userId, t.scheduledAt),
    index("posts_user_status_idx").on(t.userId, t.status),
  ],
);

export const postPlatformResults = pgTable(
  "post_platform_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .references(() => posts.id, { onDelete: "cascade" })
      .notNull(),
    socialAccountId: uuid("social_account_id")
      .references(() => socialAccounts.id, { onDelete: "cascade" })
      .notNull(),
    externalPostId: text("external_post_id"),
    status: varchar("status", { length: 20 }).notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("post_platform_results_post_id_idx").on(t.postId),
    // Idempotency guard: a post can only be published to the same account
    // once. Inngest retries of `post-publish` will now no-op on duplicates.
    uniqueIndex("post_platform_results_unique_post_account").on(
      t.postId,
      t.socialAccountId,
    ),
  ],
);

// One-time-use OAuth state nonces. A row is inserted when the user is
// redirected to the provider's authorize URL and atomically deleted on
// callback. Expired rows are swept opportunistically and by a cron job.
// The unique index on `nonce` guarantees replay rejection even if two
// callbacks race.
export const oauthStates = pgTable(
  "oauth_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nonce: text("nonce").notNull(),
    clerkId: text("clerk_id").notNull(),
    platformId: varchar("platform_id", { length: 50 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("oauth_states_nonce_unique").on(t.nonce),
    index("oauth_states_expires_at_idx").on(t.expiresAt),
  ],
);

// Deduplication table for inbound social webhooks. We record a row per
// verified event and rely on the unique index to swallow replays.
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 50 }).notNull(),
    externalEventId: text("external_event_id").notNull(),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("webhook_events_unique").on(t.provider, t.externalEventId),
  ],
);

// Per-user notifications (e.g. partial publish, token expired, billing).
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    kind: varchar("kind", { length: 50 }).notNull(),
    title: text("title").notNull(),
    body: text("body"),
    data: jsonb("data"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const autoReplyRules = pgTable(
  "auto_reply_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    triggerType: varchar("trigger_type", { length: 20 }).default("keywords").notNull(),
    keywords: jsonb("keywords").default([]).notNull(),
    isAi: boolean("is_ai").default(false).notNull(),
    aiPrompt: text("ai_prompt"),
    responseContent: text("response_content"),
    selectedAccounts: jsonb("selected_accounts").default([]).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    replyCount: integer("reply_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("auto_reply_rules_user_id_idx").on(t.userId)],
);

export const autoReplyLogs = pgTable(
  "auto_reply_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ruleId: uuid("rule_id")
      .references(() => autoReplyRules.id, { onDelete: "cascade" })
      .notNull(),
    platform: varchar("platform", { length: 50 }).notNull(),
    externalPostId: text("external_post_id").notNull(),
    externalCommentId: text("external_comment_id").notNull().unique(),
    commentText: text("comment_text"),
    response: text("response").notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("auto_reply_logs_rule_id_idx").on(t.ruleId)],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    url: text("url").notNull(),
    imageKitFileId: text("image_kit_file_id").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    name: text("name"),
    size: integer("size"),
    mimeType: varchar("mime_type", { length: 100 }),
    fileType: varchar("file_type", { length: 20 }).default("image"),
    altText: text("alt_text"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("media_assets_user_id_idx").on(t.userId)],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  socialAccounts: many(socialAccounts),
  posts: many(posts),
  autoReplyRules: many(autoReplyRules),
  mediaAssets: many(mediaAssets),
}));

export const socialAccountsRelations = relations(socialAccounts, ({ one }) => ({
  user: one(users, {
    fields: [socialAccounts.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  platformResults: many(postPlatformResults),
}));
