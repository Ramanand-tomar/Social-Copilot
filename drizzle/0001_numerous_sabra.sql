ALTER TABLE "scheduled_jobs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "scheduled_jobs" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_captions_period_start" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "auto_reply_logs_rule_id_idx" ON "auto_reply_logs" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "auto_reply_rules_user_id_idx" ON "auto_reply_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "media_assets_user_id_idx" ON "media_assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "post_platform_results_post_id_idx" ON "post_platform_results" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "posts_user_scheduled_idx" ON "posts" USING btree ("user_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "posts_user_status_idx" ON "posts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "social_accounts_user_id_idx" ON "social_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_accounts_unique_per_user" ON "social_accounts" USING btree ("user_id","platform","platform_account_id");