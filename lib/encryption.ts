import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export function getCurrentVersion(): number {
  const v = process.env.ENCRYPTION_KEY_VERSION;
  return v ? Number.parseInt(v, 10) : 1;
}

function getKeyForVersion(version: number): Buffer {
  const currentVersion = getCurrentVersion();
  const envName =
    version === currentVersion ? "ENCRYPTION_KEY" : `ENCRYPTION_KEY_V${version}`;

  let keyHex = process.env[envName];
  if (!keyHex && version === 1) {
    keyHex = process.env.ENCRYPTION_KEY_V1 || process.env.ENCRYPTION_KEY;
  }

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
  const version = getCurrentVersion();
  const keyBuffer = getKeyForVersion(version);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");
  return `v${version}:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  let version = getCurrentVersion();
  let ivHex: string | undefined;
  let authTagHex: string | undefined;
  let encrypted: string | undefined;

  if (parts.length === 4 && /^v\d+$/.test(parts[0] ?? "")) {
    version = Number.parseInt((parts[0] ?? "v1").slice(1), 10);
    [, ivHex, authTagHex, encrypted] = parts;
  } else if (parts.length === 3) {
    version = 1;
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
