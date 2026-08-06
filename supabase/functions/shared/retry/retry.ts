/**
 * retry/retry.ts
 * ─────────────────────────────────────────────────────────────────
 * Exponential backoff retry framework with jitter.
 * Used for all external API calls (AI, Maps, email, SMS).
 *
 * Algorithm: delay = min(base * 2^attempt + jitter, maxDelay)
 * Full jitter: jitter = random(0, delay) — prevents thundering herd.
 *
 * Usage:
 *   const result = await withRetry(
 *     () => callOpenAI(prompt),
 *     { attempts: 3, baseDelayMs: 500, maxDelayMs: 10_000 },
 *   );
 *
 *   // With custom should-retry predicate:
 *   const result = await withRetry(
 *     () => callMapsApi(origin, destination),
 *     { attempts: 3, shouldRetry: (err) => err.status === 429 },
 *   );
 */

import { ExternalServiceError } from "../errors/app-error.ts";

// ── Options ────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Total number of attempts (including the first). Default: 3. */
  attempts?:    number;
  /** Base delay in milliseconds. Default: 500. */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds. Default: 10_000. */
  maxDelayMs?:  number;
  /** Custom predicate — return true to retry, false to throw immediately. */
  shouldRetry?: (error: unknown) => boolean;
  /** Identifier for logging. */
  operationName?: string;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "shouldRetry" | "operationName">> = {
  attempts:    3,
  baseDelayMs: 500,
  maxDelayMs:  10_000,
};

// ── Core Retry Function ────────────────────────────────────────────

/**
 * Retries an async operation with exponential backoff + full jitter.
 * Throws the last error if all attempts fail.
 */
export async function withRetry<T>(
  operation:  () => Promise<T>,
  options:    RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.attempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;

      // Check if we should retry this error
      if (opts.shouldRetry && !opts.shouldRetry(err)) {
        throw err;
      }

      // Don't wait after the last attempt
      if (attempt < opts.attempts - 1) {
        const delay = computeDelay(attempt, opts.baseDelayMs, opts.maxDelayMs);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// ── Delay Computation ──────────────────────────────────────────────

/**
 * Computes delay with full jitter:
 *   cap = min(base * 2^attempt, maxDelay)
 *   delay = random(0, cap)
 */
function computeDelay(
  attempt: number,
  baseMs: number,
  maxMs: number,
): number {
  const exponential = baseMs * Math.pow(2, attempt);
  const cap         = Math.min(exponential, maxMs);
  return Math.random() * cap;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Retry Predicates ───────────────────────────────────────────────

/** Retry only on HTTP 429 (rate limit) and 5xx errors. */
export function retryOnTransient(err: unknown): boolean {
  if (err instanceof ExternalServiceError) return true;
  if (err instanceof Response) return err.status === 429 || err.status >= 500;
  return true; // Default: retry all
}

/** Retry only on HTTP 429. Used for strict API quota management. */
export function retryOnRateLimit(err: unknown): boolean {
  if (err instanceof Response) return err.status === 429;
  return false;
}
