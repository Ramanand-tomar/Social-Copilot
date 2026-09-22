CREATE TABLE IF NOT EXISTS "oauth_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nonce" text,
  "clerk_id" text NOT NULL,
  "platform_id" varchar(50) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "oauth_states" ADD COLUMN IF NOT EXISTS "state" text;
ALTER TABLE "oauth_states" ADD COLUMN IF NOT EXISTS "code_verifier" text;
ALTER TABLE "oauth_states" ADD COLUMN IF NOT EXISTS "used_at" timestamp;
ALTER TABLE "oauth_states" ALTER COLUMN "nonce" DROP NOT NULL;

UPDATE "oauth_states" SET "state" = "nonce" WHERE "state" IS NULL;
DELETE FROM "oauth_states" WHERE "state" IS NULL;
ALTER TABLE "oauth_states" ALTER COLUMN "state" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "oauth_states_state_unique" ON "oauth_states" ("state");
CREATE INDEX IF NOT EXISTS "oauth_states_expires_at_idx" ON "oauth_states" ("expires_at");
