import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

type Row = {
  state: string;
  clerkId: string;
  platformId: string;
  codeVerifier?: string | null;
  expiresAt: Date;
  usedAt?: Date | null;
};

const store = new Map<string, Row>();

vi.mock("./db", () => {
  return {
    db: {
      insert: () => ({
        values: async (row: Row) => {
          store.set(row.state, { ...row, usedAt: null });
        },
      }),
      delete: () => ({
        where: () => ({
          catch: () => Promise.resolve(),
          then: <T>(onFulfilled?: (val: unknown[]) => T) => Promise.resolve([]).then(onFulfilled),
        }),
      }),
      update: () => ({
        set: (updateValues: Partial<Row>) => ({
          where: () => ({
            returning: async () => {
              // Introspect store for a valid un-used matching state
              for (const [, v] of store) {
                if (!v.usedAt && v.expiresAt.getTime() > Date.now()) {
                  v.usedAt = updateValues.usedAt || new Date();
                  return [v];
                }
              }
              return [];
            },
          }),
        }),
      }),
    },
  };
});

import { signOAuthState, consumeOAuthState, generatePKCE } from "./oauth-state";

beforeAll(() => {
  process.env.ENCRYPTION_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});

beforeEach(() => {
  store.clear();
});

describe("PKCE helper", () => {
  it("generates code_verifier and code_challenge", () => {
    const pkce = generatePKCE();
    expect(pkce.codeVerifier).toBeDefined();
    expect(pkce.codeChallenge).toBeDefined();
    expect(pkce.codeVerifier.length).toBeGreaterThan(40);
  });
});

describe("oauth-state (stored state)", () => {
  it("signs and consumes state successfully", async () => {
    const { codeVerifier } = generatePKCE();
    const state = await signOAuthState("clerk_a", "twitter", codeVerifier);
    expect(state).toBeDefined();

    const consumed = await consumeOAuthState(state, "clerk_a", "twitter");
    expect(consumed).not.toBeNull();
    expect(consumed?.clerkId).toBe("clerk_a");
    expect(consumed?.platformId).toBe("twitter");
    expect(consumed?.codeVerifier).toBe(codeVerifier);
  });

  it("rejects replay of consumed state", async () => {
    const state = await signOAuthState("clerk_a", "twitter");
    const first = await consumeOAuthState(state, "clerk_a", "twitter");
    expect(first).not.toBeNull();

    const second = await consumeOAuthState(state, "clerk_a", "twitter");
    expect(second).toBeNull();
  });

  it("rejects expired state", async () => {
    const state = await signOAuthState("clerk_a", "twitter");
    const row = store.get(state)!;
    row.expiresAt = new Date(Date.now() - 1000); // Expired

    const consumed = await consumeOAuthState(state, "clerk_a", "twitter");
    expect(consumed).toBeNull();
  });

  it("rejects unknown state", async () => {
    const consumed = await consumeOAuthState("unknown_state", "clerk_a", "twitter");
    expect(consumed).toBeNull();
  });
});
