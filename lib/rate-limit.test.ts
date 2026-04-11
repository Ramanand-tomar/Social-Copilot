import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("rate-limit", () => {
  it("allows requests up to the limit", () => {
    const key = `test-a-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).ok).toBe(true);
    }
    expect(checkRateLimit(key, 5, 60_000).ok).toBe(false);
  });

  it("reports remaining correctly", () => {
    const key = `test-b-${Date.now()}-${Math.random()}`;
    const first = checkRateLimit(key, 3, 60_000);
    expect(first.remaining).toBe(2);
    const second = checkRateLimit(key, 3, 60_000);
    expect(second.remaining).toBe(1);
  });

  it("isolates keys from each other", () => {
    const keyA = `test-c-a-${Date.now()}-${Math.random()}`;
    const keyB = `test-c-b-${Date.now()}-${Math.random()}`;
    expect(checkRateLimit(keyA, 1, 60_000).ok).toBe(true);
    expect(checkRateLimit(keyA, 1, 60_000).ok).toBe(false);
    expect(checkRateLimit(keyB, 1, 60_000).ok).toBe(true);
  });
});
