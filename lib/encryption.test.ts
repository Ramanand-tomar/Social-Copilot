import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "./encryption";

beforeAll(() => {
  // Deterministic test key (32 bytes / 64 hex).
  process.env.ENCRYPTION_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});

describe("encryption", () => {
  it("round-trips plaintext", () => {
    const plaintext = "twitter-access-token-xyz";
    const ct = encrypt(plaintext);
    expect(decrypt(ct)).toBe(plaintext);
  });

  it("produces a unique IV per call (two encryptions of the same plaintext differ)", () => {
    const a = encrypt("same-value");
    const b = encrypt("same-value");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("same-value");
    expect(decrypt(b)).toBe("same-value");
  });

  it("rejects tampered authTag", () => {
    const ct = encrypt("secret");
    const parts = ct.split(":");
    // Flip the auth tag
    parts[2] = "0".repeat(parts[2].length);
    const tampered = parts.join(":");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("writes versioned format (v1:)", () => {
    const ct = encrypt("hello");
    expect(ct.startsWith("v1:")).toBe(true);
  });

  it("decrypts legacy iv:tag:ct format too", () => {
    // Forge a legacy-format ciphertext by dropping the version prefix.
    const ct = encrypt("legacy-value");
    const legacy = ct.replace(/^v1:/, "");
    expect(decrypt(legacy)).toBe("legacy-value");
  });
});
