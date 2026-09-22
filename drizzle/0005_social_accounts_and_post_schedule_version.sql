ALTER TABLE "social_accounts" ADD COLUMN IF NOT EXISTS "display_name" text;
ALTER TABLE "social_accounts" ADD COLUMN IF NOT EXISTS "avatar_url" text;
ALTER TABLE "social_accounts" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'active' NOT NULL;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "schedule_version" integer DEFAULT 0 NOT NULL;
