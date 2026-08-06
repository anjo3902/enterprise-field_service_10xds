/**
 * errors/error-handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Central error serialiser and HTTP response builder.
 * Every Edge Function's catch block calls handleError().
 *
 * Usage:
 *   } catch (err) {
 *     return handleError(err, correlationId, logger);
 *   }
 */

import { AppError, InternalError } from "./app-error.ts";
import type { Logger } from "../logging/logger.ts";

/**
 * Converts any caught error into a safe, structured HTTP Response.
 * Operational AppErrors are logged at warn level.
 * Unexpected errors are logged at error level with full stack.
 */
export function handleError(
  err: unknown,
  correlationId: string,
  log: Logger,
): Response {
  // Known operational error
  if (err instanceof AppError) {
    if (err.isOperational) {
      log.warn({
        correlationId,
        error_code:    err.code,
        error_status:  err.status,
        message:       err.message,
      });
    } else {
      log.error({
        correlationId,
        error_code:  err.code,
        message:     err.message,
        stack:       err.stack,
      });
    }

    return new Response(JSON.stringify(err.toJSON()), {
      status:  err.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Unexpected / programming error
  const wrapped = new InternalError("An unexpected error occurred", correlationId);

  log.error({
    correlationId,
    error_code: wrapped.code,
    message:    err instanceof Error ? err.message : String(err),
    stack:      err instanceof Error ? err.stack : undefined,
  });

  return new Response(JSON.stringify(wrapped.toJSON()), {
    status:  500,
    headers: { "Content-Type": "application/json" },
  });
}
