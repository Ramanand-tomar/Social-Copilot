import crypto from "crypto";
import { and, eq, lt, gt } from "drizzle-orm";
import { requireEnv } from "./env";
import { db } from "./db";
import { oauthStates } from "./db/schema";

const MAX_STATE_AGE_MS = 10 * 60 * 1000;

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function getKey(): Buffer {
  const keyHex = requireEnv("ENCRYPTION_KEY");
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string");
  }
  return key;
}

export interface OAuthStatePayload {
  clerkId: string;
  platformId: string;
  nonce: string;
  ts: number;
}

/**
 * HMAC-verifies a signed state blob and returns the decoded payload. This
 * does NOT consume the nonce — it's a cheap first-line check used by
 * `consumeOAuthState` (and the unit tests) before touching the DB.
 *
 * Exported for tests. Production callers must always go through
 * `consumeOAuthState` so the nonce is actually burned.
 */
export function verifySignature(
  state: string | null | undefined,
  expectedClerkId: string,
  expectedPlatformId: string,
): OAuthStatePayload | null {
  if (!state) return null;
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  const expectedSig = crypto.createHmac("sha256", getKey()).update(payloadB64).digest();
  const providedSig = fromB64url(sigB64);
  if (providedSig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(providedSig, expectedSig)) return null;

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString("utf8"));
  } catch {
    return null;
  }

  if (payload.clerkId !== expectedClerkId) return null;
  if (payload.platformId !== expectedPlatformId) return null;
  if (Date.now() - payload.ts > MAX_STATE_AGE_MS) return null;

  return payload;
}

/**
 * Mints a one-time-use OAuth state. Persists the nonce in `oauth_states`
 * so that `consumeOAuthState` can atomically delete it on callback and
 * reject any replay within the 10-minute TTL.
 */
export async function signOAuthState(
  clerkId: string,
  platformId: string,
): Promise<string> {
  const nonce = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const payload: OAuthStatePayload = {
    clerkId,
    platformId,
    nonce,
    ts: now,
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = b64url(Buffer.from(payloadJson, "utf8"));
  const sig = crypto.createHmac("sha256", getKey()).update(payloadB64).digest();

  await db.insert(oauthStates).values({
    nonce,
    clerkId,
    platformId,
    expiresAt: new Date(now + MAX_STATE_AGE_MS),
  });

  // Opportunistic sweep of expired rows. Best-effort — failure here must
  // never block a connect flow.
  db.delete(oauthStates)
    .where(lt(oauthStates.expiresAt, new Date()))
    .catch(() => {});

  return `${payloadB64}.${b64url(sig)}`;
}

/**
 * Atomically consumes a signed state. Returns the payload on success and
 * `null` on any failure (bad signature, expired ts, cross-user/platform
 * mismatch, unknown nonce, already-consumed nonce). After a successful
 * call the nonce row is deleted and can never be consumed again.
 */
export async function consumeOAuthState(
  state: string | null | undefined,
  expectedClerkId: string,
  expectedPlatformId: string,
): Promise<OAuthStatePayload | null> {
  const payload = verifySignature(state, expectedClerkId, expectedPlatformId);
  if (!payload) return null;

  // DELETE ... WHERE nonce = $1 AND expires_at > now() RETURNING id.
  // A single round trip that handles both "unknown nonce" and "expired"
  // in the SQL predicate, so two concurrent callbacks race on the
  // unique `nonce` index and only one wins.
  const deleted = await db
    .delete(oauthStates)
    .where(
      and(
        eq(oauthStates.nonce, payload.nonce),
        gt(oauthStates.expiresAt, new Date()),
      ),
    )
    .returning({ id: oauthStates.id });

  if (deleted.length === 0) return null;
  return payload;
}
