/**
 * utils/date-helpers.ts
 * ─────────────────────────────────────────────────────────────────
 * Date / time utility functions used throughout the platform.
 * All times are handled in UTC internally. Display formatting
 * happens on the client side.
 */

/** Returns current UTC timestamp as ISO 8601 string. */
export function nowUtc(): string {
  return new Date().toISOString();
}

/**
 * Adds `minutes` to a date and returns ISO 8601 string.
 * Useful for computing SLA breach timestamps.
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Adds `hours` to a date. */
export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}

/** Adds `days` to a date. */
export function addDays(date: Date, days: number): Date {
  return addHours(date, days * 24);
}

/**
 * Returns true if the given date is in the past (before now UTC).
 * Used for SLA breach detection and token expiry checks.
 */
export function isExpired(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getTime() < Date.now();
}

/**
 * Returns the difference in minutes between two dates.
 * Positive value means `end` is after `start`.
 */
export function diffInMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

/**
 * Returns the first day of the current calendar month as a Date (UTC).
 * Used in analytics snapshot date partitioning.
 */
export function currentMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Formats a Date as a YYYY-MM-DD date string (UTC).
 * Matches PostgreSQL DATE column format.
 */
export function toDateString(date: Date): string {
  return date.toISOString().substring(0, 10);
}
