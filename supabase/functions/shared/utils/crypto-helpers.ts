/**
 * utils/crypto-helpers.ts
 * ─────────────────────────────────────────────────────────────────
 * Cryptographic utilities using Deno's native Web Crypto API.
 * Used for: invitation token hashing, AI cache key generation,
 * file deduplication SHA-256 hashing.
 */

/**
 * Computes a SHA-256 hash of a string and returns it as lowercase hex.
 * Used for AI diagnosis cache key generation and invitation token storage.
 *
 * @example
 *   const key = await sha256("asset-uuid:image-bytes-base64");
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data    = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a cryptographically secure random token of `byteLength` bytes.
 * Returns a hex string (length = byteLength * 2).
 * Used for generating invitation tokens.
 *
 * @example
 *   const token = generateSecureToken(32); // 64-char hex string
 */
export function generateSecureToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Use when comparing stored token hashes to user-provided tokens.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
