import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const API_KEY_HASH_VERSION = "v2";

function getApiKeyPepper() {
  return process.env.API_KEY_PEPPER ?? "";
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmacSha256(value: string) {
  return createHmac("sha256", getApiKeyPepper()).update(value).digest("hex");
}

function safeEqualHex(a: string, b: string) {
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
}

export function hashApiKeyForStorage(secret: string) {
  return `${API_KEY_HASH_VERSION}:${hmacSha256(secret)}`;
}

export function hashApiKeyLegacy(secret: string) {
  return sha256(secret);
}

export function getApiKeyLookupHashes(secret: string) {
  const legacy = hashApiKeyLegacy(secret);
  const v2 = hashApiKeyForStorage(secret);
  const v1 = `v1:${legacy}`;
  return [v2, v1, legacy];
}

export function verifyApiKeySecret(secret: string, storedHash: string) {
  if (storedHash.startsWith("v2:")) {
    const current = hashApiKeyForStorage(secret).slice(3);
    return safeEqualHex(current, storedHash.slice(3));
  }

  if (storedHash.startsWith("v1:")) {
    const legacy = hashApiKeyLegacy(secret);
    return safeEqualHex(legacy, storedHash.slice(3));
  }

  return safeEqualHex(hashApiKeyLegacy(secret), storedHash);
}
