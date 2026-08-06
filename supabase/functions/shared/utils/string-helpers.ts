/**
 * utils/string-helpers.ts
 * ─────────────────────────────────────────────────────────────────
 * String manipulation utilities.
 */

/** Generates a sequential reference number like "TKT-2026-000123". */
export function buildReferenceNumber(
  prefix: string,
  sequence: number,
  year = new Date().getUTCFullYear(),
): string {
  return `${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
}

/** Truncates a string to maxLen characters, appending "…" if truncated. */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + "…";
}

/** Converts a snake_case string to camelCase. */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Strips all whitespace from both ends and collapses internal runs. */
export function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, " ");
}

/** Returns true if str is a non-empty string after trimming. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Simple email format check (not RFC 5322 complete — use Zod for that). */
export function looksLikeEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}
