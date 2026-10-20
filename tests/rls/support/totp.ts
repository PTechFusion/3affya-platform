// RFC 6238 TOTP (HMAC-SHA1, 30-second steps, 6 digits, the parameters Supabase Auth uses) on top of RFC 4226 HOTP, so the
// admin persona can pass the TOTP step and hold an aal2 session (ADR-8) without an authenticator app.
import { createHmac } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_STEP_SECONDS = 30;

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error("TOTP secret is not base32");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function hotp(key: Buffer, counter: number, digits = 6): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(message).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const binary =
    (((digest[offset] ?? 0) & 0x7f) << 24) |
    ((digest[offset + 1] ?? 0) << 16) |
    ((digest[offset + 2] ?? 0) << 8) |
    (digest[offset + 3] ?? 0);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function totp(secretBase32: string, atMs = Date.now(), digits = 6): string {
  return hotp(base32Decode(secretBase32), Math.floor(atMs / 1000 / TOTP_STEP_SECONDS), digits);
}

// Milliseconds left in the current step; callers wait out the last few seconds so a code is not stale on arrival.
export function msLeftInStep(atMs = Date.now()): number {
  const stepMs = TOTP_STEP_SECONDS * 1000;
  return stepMs - (atMs % stepMs);
}
