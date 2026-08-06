/**
 * errors/app-error.ts
 * ─────────────────────────────────────────────────────────────────
 * Application error hierarchy used by every Edge Function.
 * All errors carry:
 *   - HTTP status code
 *   - Machine-readable error code
 *   - Human-readable message
 *   - Optional correlation ID for distributed tracing
 *
 * Usage:
 *   throw new ForbiddenError("You do not own this ticket", correlationId);
 *   throw new ValidationError("org_id is required", correlationId, fieldErrors);
 */

// ── Base Error ────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly correlationId: string | undefined;
  public readonly isOperational: boolean;

  constructor(
    code: string,
    status: number,
    message: string,
    correlationId?: string,
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.correlationId = correlationId;
    this.isOperational = isOperational;
    // Capture V8 stack trace in Deno/Node environments (not in standard TS types)
    (Error as unknown as { captureStackTrace?: (t: object, c: unknown) => void })
      .captureStackTrace?.(this, this.constructor);
  }

  /** Serialise to a safe JSON body (no internal stack trace). */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        code:           this.code,
        message:        this.message,
        correlation_id: this.correlationId,
      },
    };
  }
}

// ── Concrete Error Classes ─────────────────────────────────────────

/** 400 — Request payload or query params are malformed. */
export class BadRequestError extends AppError {
  constructor(message = "Bad request", correlationId?: string) {
    super("BAD_REQUEST", 400, message, correlationId);
  }
}

/** 400 — Zod/schema validation failed. Carries field-level details. */
export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(
    message = "Validation failed",
    correlationId?: string,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super("VALIDATION_ERROR", 422, message, correlationId);
    this.fieldErrors = fieldErrors;
  }

  override toJSON(): Record<string, unknown> {
    return {
      error: {
        code:           this.code,
        message:        this.message,
        field_errors:   this.fieldErrors,
        correlation_id: this.correlationId,
      },
    };
  }
}

/** 401 — Missing or invalid JWT. */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", correlationId?: string) {
    super("UNAUTHORIZED", 401, message, correlationId);
  }
}

/** 403 — Valid JWT but insufficient role or tenant mismatch. */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", correlationId?: string) {
    super("FORBIDDEN", 403, message, correlationId);
  }
}

/** 403 specialization — Tenant boundary violation. */
export class TenantMismatchError extends AppError {
  constructor(
    message = "Tenant context mismatch — cross-tenant access denied",
    correlationId?: string,
  ) {
    super("TENANT_MISMATCH", 403, message, correlationId);
  }
}

/** 404 — Requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(resource = "Resource", correlationId?: string) {
    super("NOT_FOUND", 404, `${resource} not found`, correlationId);
  }
}

/** 409 — Unique constraint or business rule conflict. */
export class ConflictError extends AppError {
  constructor(message = "Conflict", correlationId?: string) {
    super("CONFLICT", 409, message, correlationId);
  }
}

/** 429 — Client exceeded allowed request rate. */
export class RateLimitError extends AppError {
  public readonly retryAfterSeconds: number;

  constructor(
    retryAfterSeconds = 60,
    correlationId?: string,
  ) {
    super("RATE_LIMIT_EXCEEDED", 429, "Too many requests", correlationId);
    this.retryAfterSeconds = retryAfterSeconds;
  }

  override toJSON(): Record<string, unknown> {
    return {
      error: {
        code:             this.code,
        message:          this.message,
        retry_after_s:    this.retryAfterSeconds,
        correlation_id:   this.correlationId,
      },
    };
  }
}

/** 502 — Downstream API (AI, Maps, email) failed. */
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message?: string, correlationId?: string) {
    super(
      "EXTERNAL_SERVICE_ERROR",
      502,
      message ?? `External service '${service}' failed`,
      correlationId,
    );
    this.service = service;
  }
}

/** 500 — Unexpected internal error (programming bug, infra failure). */
export class InternalError extends AppError {
  constructor(message = "Internal server error", correlationId?: string) {
    super("INTERNAL_ERROR", 500, message, correlationId, false);
  }
}
