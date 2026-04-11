-- One-time-use OAuth state nonces. Row inserted on /connect, atomically
-- deleted on /callback (DELETE ... RETURNING). Unique index on nonce makes
-- double-consumption impossible. Generated manually — safe to re-run.

CREATE TABLE IF NOT EXISTS "oauth_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nonce" text NOT NULL,
  "clerk_id" text NOT NULL,
  "platform_id" varchar(50) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "oauth_states_nonce_unique"
  ON "oauth_states" ("nonce");

CREATE INDEX IF NOT EXISTS "oauth_states_expires_at_idx"
  ON "oauth_states" ("expires_at");
