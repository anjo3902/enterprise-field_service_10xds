/**
 * response/response-helpers.ts
 * ─────────────────────────────────────────────────────────────────
 * Typed HTTP response factory functions.
 * Every Edge Function returns through one of these helpers to ensure
 * a consistent response envelope across the entire API surface.
 *
 * Response Envelope:
 *   Success: { success: true, data: T, meta?: M }
 *   Error:   { error: { code, message, field_errors?, correlation_id } }
 *
 * Usage:
 *   return respond.ok({ ticket });
 *   return respond.created({ ticket }, "TKT-2026-000001");
 *   return respond.notFound("Ticket");
 */

// ── CORS Headers ──────────────────────────────────────────────────

const CORS_HEADERS = {
  "Content-Type":                "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-correlation-id",
} as const;

// ── Handle CORS Preflight ─────────────────────────────────────────

export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ── Success Responses ─────────────────────────────────────────────

function json<T>(data: T, status: number, extra?: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ success: true, data, ...extra }),
    { status, headers: CORS_HEADERS },
  );
}

export const respond = {
  /** 200 OK — General success with data payload */
  ok<T>(data: T, meta?: Record<string, unknown>): Response {
    return json(data, 200, meta ? { meta } : undefined);
  },

  /** 201 Created — Resource successfully created */
  created<T>(data: T, resourceId?: string): Response {
    return json(data, 201, resourceId ? { resource_id: resourceId } : undefined);
  },

  /** 202 Accepted — Async job accepted */
  accepted(jobId?: string, message = "Request accepted for processing"): Response {
    return json({ message, job_id: jobId }, 202);
  },

  /** 204 No Content — Action performed, no body */
  noContent(): Response {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  },

  // ── Error Responses ─────────────────────────────────────────────

  badRequest(message: string, correlationId?: string, fieldErrors?: Record<string, string[]>): Response {
    return error(400, "BAD_REQUEST", message, correlationId, fieldErrors);
  },

  unauthorized(message = "Unauthorized", correlationId?: string): Response {
    return error(401, "UNAUTHORIZED", message, correlationId);
  },

  forbidden(message = "Forbidden", correlationId?: string): Response {
    return error(403, "FORBIDDEN", message, correlationId);
  },

  notFound(resource = "Resource", correlationId?: string): Response {
    return error(404, "NOT_FOUND", `${resource} not found`, correlationId);
  },

  conflict(message: string, correlationId?: string): Response {
    return error(409, "CONFLICT", message, correlationId);
  },

  unprocessable(message: string, correlationId?: string, fieldErrors?: Record<string, string[]>): Response {
    return error(422, "VALIDATION_ERROR", message, correlationId, fieldErrors);
  },

  tooManyRequests(retryAfterSeconds = 60, correlationId?: string): Response {
    const body = {
      error: {
        code:           "RATE_LIMIT_EXCEEDED",
        message:        "Too many requests",
        retry_after_s:  retryAfterSeconds,
        correlation_id: correlationId,
      },
    };
    return new Response(JSON.stringify(body), {
      status:  429,
      headers: { ...CORS_HEADERS, "Retry-After": String(retryAfterSeconds) },
    });
  },

  internalError(message = "Internal server error", correlationId?: string): Response {
    return error(500, "INTERNAL_ERROR", message, correlationId);
  },
};

// ── Private error builder ─────────────────────────────────────────

function error(
  status: number,
  code: string,
  message: string,
  correlationId?: string,
  fieldErrors?: Record<string, string[]>,
): Response {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
        ...(fieldErrors ? { field_errors: fieldErrors } : {}),
        ...(correlationId ? { correlation_id: correlationId } : {}),
      },
    }),
    { status, headers: CORS_HEADERS },
  );
}
