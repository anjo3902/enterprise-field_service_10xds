/**
 * logging/correlation.ts
 * ─────────────────────────────────────────────────────────────────
 * Correlation ID utilities for distributed request tracing.
 * Every Edge Function invocation generates or propagates a
 * correlation_id carried through all downstream calls and logs.
 *
 * Usage:
 *   const correlationId = extractOrGenerateCorrelationId(req);
 */

import { generateUuid } from "../utils/uuid-helpers.ts";

const HEADER_NAME = "x-correlation-id";

/**
 * Extracts the correlation ID from an incoming request header.
 * If missing, generates a fresh UUID v4.
 * The same ID must be forwarded on all outbound calls.
 */
export function extractOrGenerateCorrelationId(req: Request): string {
  return req.headers.get(HEADER_NAME) ?? generateUuid();
}

/**
 * Adds the correlation ID to a set of outbound Headers.
 * Call this before any fetch() to a downstream service.
 */
export function attachCorrelationId(
  headers: Headers,
  correlationId: string,
): Headers {
  headers.set(HEADER_NAME, correlationId);
  return headers;
}
