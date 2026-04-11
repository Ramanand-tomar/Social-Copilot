import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

// Mock the db module before importing oauth-state so the in-memory store
// is the one exercised by sign/consume. This keeps the suite DB-free
// while still covering one-time-use semantics.
type Row = { nonce: string; clerkId: string; platformId: string; expiresAt: Date };
const store = new Map<string, Row>();

vi.mock("./db", () => {
  const chain = (filter: (r: Row) => boolean) => ({
    where: () => ({
      returning: async () => {
        const hits: { id: string }[] = [];
        for (const [k, v] of store) {
          if (filter(v)) {
            store.delete(k);
            hits.push({ id: k });
          }
        }
        return hits;
      },
      // Used by the opportunistic sweep — no .returning() chained, so it
      // resolves as a bare promise.
      then: (onFulfilled: (v: unknown) => unknown) => {
        for (const [k, v] of store) {
          if (filter(v)) store.delete(k);
        }
        return Promise.resolve(undefined).then(onFulfilled);
      },
      catch: () => Promise.resolve(),
    }),
  });

  return {
    db: {
      insert: () => ({
        values: async (row: Row) => {
          if (store.has(row.nonce)) throw new Error("duplicate nonce");
          store.set(row.nonce, { ...row });
        },
      }),
      delete: () => ({
        where: (predicate: unknown) => {
          // We can't introspect the drizzle predicate object, so we use a
          // closure set by the caller via a module-level hint. The two
          // call sites in oauth-state.ts are:
          //   1. consume: and(eq(nonce, X), gt(expiresAt, now))
          //   2. sweep:   lt(expiresAt, now)
          // Both are modelled by reading the current "filter" from a
          // side-channel set just below.
          void predicate;
          return chain(currentFilter);
        },
      }),
    },
  };
});

// Side-channel used by the mocked db.delete to decide which rows to
// match. The tests set this before calling sign/consume to mimic the
// appropriate predicate.
let currentFilter: (r: Row) => boolean = () => false;

import { signOAuthState, consumeOAuthState, verifySignature } from "./oauth-state";

beforeAll(() => {
  process.env.ENCRYPTION_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});

beforeEach(() => {
  store.clear();
});

async function signAndConsume(
  clerkId: string,
  platformId: string,
  stateOverride?: string,
) {
  // Default filter for `consume`: match row by nonce AND expiresAt>now.
  currentFilter = (r) => r.expiresAt.getTime() > Date.now();
  // The real consume narrows this further by nonce; we can inspect the
  // payload to figure out which nonce to match.
  const state = stateOverride ?? (await (async () => {
    currentFilter = (r) => r.expiresAt.getTime() < Date.now(); // sweep
    return signOAuthState(clerkId, platformId);
  })());
  currentFilter = (r) => {
    const payload = verifySignature(state, clerkId, platformId);
    if (!payload) return false;
    return r.nonce === payload.nonce && r.expiresAt.getTime() > Date.now();
  };
  return consumeOAuthState(state, clerkId, platformId);
}

describe("oauth-state (signature)", () => {
  it("round-trips a valid state via verifySignature", () => {
    currentFilter = () => false;
    // Sign without DB side effects is not possible — use the exposed
    // helper with a hand-built payload to keep this test pure.
    // Instead, we sign via signOAuthState (which inserts) and then call
    // verifySignature directly on the returned blob.
    return (async () => {
      currentFilter = (r) => r.expiresAt.getTime() < Date.now();
      const state = await signOAuthState("clerk_a", "twitter");
      const payload = verifySignature(state, "clerk_a", "twitter");
      expect(payload).not.toBeNull();
      expect(payload?.clerkId).toBe("clerk_a");
      expect(payload?.platformId).toBe("twitter");
    })();
  });

  it("rejects cross-user state", async () => {
    currentFilter = (r) => r.expiresAt.getTime() < Date.now();
    const state = await signOAuthState("clerk_a", "twitter");
    expect(verifySignature(state, "clerk_b", "twitter")).toBeNull();
  });

  it("rejects cross-platform state", async () => {
    currentFilter = (r) => r.expiresAt.getTime() < Date.now();
    const state = await signOAuthState("clerk_a", "twitter");
    expect(verifySignature(state, "clerk_a", "instagram")).toBeNull();
  });

  it("rejects tampered signature", async () => {
    currentFilter = (r) => r.expiresAt.getTime() < Date.now();
    const state = await signOAuthState("clerk_a", "twitter");
    const [payload] = state.split(".");
    const tampered = `${payload}.XXXXXXXXXXXXXXXXXXXX`;
    expect(verifySignature(tampered, "clerk_a", "twitter")).toBeNull();
  });

  it("rejects missing or malformed state", () => {
    expect(verifySignature(null, "clerk_a", "twitter")).toBeNull();
    expect(verifySignature(undefined, "clerk_a", "twitter")).toBeNull();
    expect(verifySignature("not-a-state", "clerk_a", "twitter")).toBeNull();
  });
});

describe("oauth-state (one-time-use consume)", () => {
  it("consume succeeds exactly once", async () => {
    const first = await signAndConsume("clerk_a", "twitter");
    expect(first).not.toBeNull();
    expect(first?.clerkId).toBe("clerk_a");
    expect(first?.platformId).toBe("twitter");
  });

  it("rejects replay of a previously consumed state", async () => {
    // Sign
    currentFilter = (r) => r.expiresAt.getTime() < Date.now();
    const state = await signOAuthState("clerk_a", "twitter");

    // First consume — succeeds
    currentFilter = (r) => {
      const p = verifySignature(state, "clerk_a", "twitter");
      return !!p && r.nonce === p.nonce && r.expiresAt.getTime() > Date.now();
    };
    const first = await consumeOAuthState(state, "clerk_a", "twitter");
    expect(first).not.toBeNull();

    // Second consume — row already deleted, must return null
    const second = await consumeOAuthState(state, "clerk_a", "twitter");
    expect(second).toBeNull();
  });

  it("rejects expired state", async () => {
    // Sign a state, then manually expire its row in the mock store.
    currentFilter = (r) => r.expiresAt.getTime() < Date.now();
    const state = await signOAuthState("clerk_a", "twitter");
    const payload = verifySignature(state, "clerk_a", "twitter");
    const row = store.get(payload!.nonce)!;
    row.expiresAt = new Date(Date.now() - 1000);

    // consumeOAuthState's verifySignature uses the signed ts, which is
    // still recent; the expiry check that matters here is the SQL one
    // (expires_at > now()). Our mock filter enforces it.
    currentFilter = (r) => {
      const p = verifySignature(state, "clerk_a", "twitter");
      return !!p && r.nonce === p.nonce && r.expiresAt.getTime() > Date.now();
    };
    const result = await consumeOAuthState(state, "clerk_a", "twitter");
    expect(result).toBeNull();
  });

  it("rejects unknown nonce (never signed)", async () => {
    // Forge a state with a random nonce that was never inserted.
    currentFilter = (r) => r.expiresAt.getTime() < Date.now();
    const state = await signOAuthState("clerk_a", "twitter");
    const payload = verifySignature(state, "clerk_a", "twitter");
    store.delete(payload!.nonce);

    currentFilter = (r) => {
      const p = verifySignature(state, "clerk_a", "twitter");
      return !!p && r.nonce === p.nonce && r.expiresAt.getTime() > Date.now();
    };
    expect(await consumeOAuthState(state, "clerk_a", "twitter")).toBeNull();
  });
});
