import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes
} from "node:crypto";
import { config } from "../config";

const encryptionKey = Buffer.from(config.PII_ENCRYPTION_KEY, "hex");
const hashKey = Buffer.from(config.PII_HASH_KEY, "hex");

export function protectNationalId(value: string): {
  ciphertext: string;
  lookupHash: string;
} {
  const normalized = value.replace(/\s/g, "").toUpperCase();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(normalized, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  const ciphertext = Buffer.concat([iv, tag, encrypted]).toString("base64");
  const lookupHash = createHmac("sha256", hashKey)
    .update(normalized)
    .digest("hex");

  return { ciphertext, lookupHash };
}

export function protectSensitiveText(value: string | undefined): string | null {
  if (value === undefined || value === "") {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return `v1:${Buffer.concat([iv, tag, encrypted]).toString("base64")}`;
}

export function revealSensitiveText(ciphertext: string | null): string | null {
  if (ciphertext === null) {
    return null;
  }
  if (!ciphertext.startsWith("v1:")) {
    throw new Error("Sensitive patient field is not encrypted with the supported format");
  }

  const encrypted = Buffer.from(ciphertext.slice(3), "base64");
  if (encrypted.length < 29) {
    throw new Error("Sensitive patient field ciphertext is invalid");
  }
  const iv = encrypted.subarray(0, 12);
  const tag = encrypted.subarray(12, 28);
  const content = encrypted.subarray(28);
  const decryptor = createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decryptor.setAuthTag(tag);
  return Buffer.concat([decryptor.update(content), decryptor.final()]).toString("utf8");
}
