import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

// Key versioning lets us rotate `ENCRYPTION_KEY` without invalidating rows.
// - Encryption always uses the current `ENCRYPTION_KEY` and prefixes the
//   output with `v1:` so readers know which key to pick.
// - Decryption first checks for the `v{N}:` prefix. If it's absent we fall
//   back to the legacy `iv:tag:ct` format, so existing data keeps working.
// - To rotate, set `ENCRYPTION_KEY` to the new hex and move the old key to
//   `ENCRYPTION_KEY_V1` (etc). Decryption reaches for whichever version the
//   row carries.

const CURRENT_VERSION = 1;

function getKeyForVersion(version: number): Buffer {
  const envName =
    version === CURRENT_VERSION ? "ENCRYPTION_KEY" : `ENCRYPTION_KEY_V${version}`;
  const keyHex = process.env[envName];
  if (!keyHex) {
    throw new Error(`Missing ${envName} — cannot read v${version} ciphertext`);
  }
  const keyBuffer = Buffer.from(keyHex, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error(`${envName} must be a 32-byte hex string (64 characters)`);
  }
  return keyBuffer;
}

export function encrypt(text: string): string {
  const keyBuffer = getKeyForVersion(CURRENT_VERSION);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");
  return `v${CURRENT_VERSION}:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  let version = CURRENT_VERSION;
  let ivHex: string | undefined;
  let authTagHex: string | undefined;
  let encrypted: string | undefined;

  if (parts.length === 4 && /^v\d+$/.test(parts[0] ?? "")) {
    version = Number.parseInt((parts[0] ?? "v1").slice(1), 10);
    [, ivHex, authTagHex, encrypted] = parts;
  } else if (parts.length === 3) {
    // Legacy rows written before key versioning — decrypt with the current
    // key so old accounts keep refreshing until they're re-encrypted.
    [ivHex, authTagHex, encrypted] = parts;
  }

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted text format");
  }

  const keyBuffer = getKeyForVersion(version);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
