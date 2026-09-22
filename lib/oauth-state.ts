import crypto from "crypto";
import { and, eq, gt, lt, isNull } from "drizzle-orm";
import { db } from "./db";
import { oauthStates } from "./db/schema";

const MAX_STATE_AGE_MS = 10 * 60 * 1000;

export interface OAuthStatePayload {
  clerkId: string;
  platformId: string;
  state: string;
  codeVerifier?: string | null;
}

/**
 * Generates a PKCE code_verifier and S256 code_challenge pair.
 */
export function generatePKCE() {
  const verifierBytes = crypto.randomBytes(32);
  const codeVerifier = verifierBytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const challengeHash = crypto.createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = challengeHash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return { codeVerifier, codeChallenge };
}

/**
 * Creates and persists a stored, single-use OAuth state token in `oauth_states`.
 * Does not expose the Clerk user ID in the returned state token.
 */
export async function signOAuthState(
  clerkId: string,
  platformId: string,
  codeVerifier?: string,
): Promise<string> {
  const state = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = new Date(now + MAX_STATE_AGE_MS);

  await db.insert(oauthStates).values({
    state,
    nonce: state,
    clerkId,
    platformId,
    codeVerifier: codeVerifier ?? null,
    expiresAt,
  });

  // Opportunistic sweep of expired states
  try {
    db.delete(oauthStates).where(lt(oauthStates.expiresAt, new Date())).then(() => {}).catch(() => {});
  } catch {
    // ignore sweep errors
  }

  return state;
}

/**
 * Atomically consumes a stored OAuth state token.
 * Rejects expired, non-existent, cross-user, or replayed states.
 */
export async function consumeOAuthState(
  state: string | null | undefined,
  expectedClerkId: string,
  expectedPlatformId: string,
): Promise<OAuthStatePayload | null> {
  if (!state) return null;

  const now = new Date();

  // Atomically update used_at for matching valid state row
  const updated = await db
    .update(oauthStates)
    .set({ usedAt: now })
    .where(
      and(
        eq(oauthStates.state, state),
        eq(oauthStates.clerkId, expectedClerkId),
        eq(oauthStates.platformId, expectedPlatformId),
        gt(oauthStates.expiresAt, now),
        isNull(oauthStates.usedAt),
      ),
    )
    .returning({
      clerkId: oauthStates.clerkId,
      platformId: oauthStates.platformId,
      state: oauthStates.state,
      codeVerifier: oauthStates.codeVerifier,
    });

  if (updated.length === 0) return null;
  return updated[0];
}


