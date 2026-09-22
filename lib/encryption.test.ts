import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "./encryption";

const KEY_A = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const KEY_B = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = KEY_A;
  process.env.ENCRYPTION_KEY_VERSION = "1";
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
    parts[2] = "0".repeat(parts[2].length);
    const tampered = parts.join(":");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("writes versioned format (v1:)", () => {
    const ct = encrypt("hello");
    expect(ct.startsWith("v1:")).toBe(true);
  });

  it("decrypts legacy iv:tag:ct format too", () => {
    const ct = encrypt("legacy-value");
    const legacy = ct.replace(/^v1:/, "");
    expect(decrypt(legacy)).toBe("legacy-value");
  });

  it("supports key rotation (decryption of v1 ciphertext after rotating to v2 key)", () => {
    // Encrypt under Key A (version 1)
    process.env.ENCRYPTION_KEY = KEY_A;
    process.env.ENCRYPTION_KEY_VERSION = "1";
    const ctV1 = encrypt("secret-token-v1");

    // Rotate keys: Key B becomes current (version 2), Key A becomes V1
    process.env.ENCRYPTION_KEY = KEY_B;
    process.env.ENCRYPTION_KEY_V1 = KEY_A;
    process.env.ENCRYPTION_KEY_VERSION = "2";

    // Decrypt v1 ciphertext under v2 active configuration
    expect(decrypt(ctV1)).toBe("secret-token-v1");

    // Encrypt under Key B (version 2)
    const ctV2 = encrypt("secret-token-v2");
    expect(ctV2.startsWith("v2:")).toBe(true);
    expect(decrypt(ctV2)).toBe("secret-token-v2");

    // Reset back to Key A for clean test environment
    process.env.ENCRYPTION_KEY = KEY_A;
    process.env.ENCRYPTION_KEY_VERSION = "1";
    delete process.env.ENCRYPTION_KEY_V1;
  });
});
