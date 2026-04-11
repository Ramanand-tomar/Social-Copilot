-- Idempotency, notifications, webhook dedup, and scheduled-post timezone.
-- Generated manually (not via drizzle-kit generate) — safe to re-run because
-- of the IF NOT EXISTS guards.

ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "scheduled_timezone" text;

-- A post can only be published to a given social account once. Inngest
-- retries on `post-publish` will now fail the insert on duplicate and we
-- read the existing row instead.
CREATE UNIQUE INDEX IF NOT EXISTS "post_platform_results_unique_post_account"
  ON "post_platform_results" ("post_id", "social_account_id");

-- Inbound webhook dedup (Meta, generic HMAC, etc.).
CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" varchar(50) NOT NULL,
  "external_event_id" text NOT NULL,
  "received_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_unique"
  ON "webhook_events" ("provider", "external_event_id");

-- Per-user notifications (partial publish, token expired, billing).
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" varchar(50) NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "data" jsonb,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "notifications_user_created_idx"
  ON "notifications" ("user_id", "created_at");
