/**
 * utils/uuid-helpers.ts
 * ─────────────────────────────────────────────────────────────────
 * UUID v4 generation and validation helpers.
 * Deno ships with the Web Crypto API natively — no external library needed.
 */

/** Generates a RFC 4122 compliant UUID v4. */
export function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * Returns true if the input is a valid UUID v4 string.
 * Accepts both upper and lower case hex digits.
 */
export function isValidUuid(value: string): boolean {
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(value);
}

/**
 * Asserts that a value is a valid UUID.
 * Throws a TypeError if invalid (use in schema-level checks only).
 */
export function assertUuid(value: string, fieldName = "id"): void {
  if (!isValidUuid(value)) {
    throw new TypeError(`Invalid UUID for field '${fieldName}': "${value}"`);
  }
}
