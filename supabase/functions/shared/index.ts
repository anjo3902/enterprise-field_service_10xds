/**
 * shared/index.ts
 * ─────────────────────────────────────────────────────────────────
 * Barrel export — every Edge Function imports from this single file.
 * This provides a clean, stable public API for the shared module.
 *
 * Usage in an Edge Function:
 *   import {
 *     verifyRequest, assertRole, parseBody,
 *     respond, handleError, createLogger,
 *     adminClient, publishEvent, EVENTS,
 *   } from "../shared/index.ts";
 */

// Config
export { config }                               from "./config/config.ts";
export type { AppConfig }                       from "./config/config.ts";

// Database
export { adminClient, userClient, db }          from "./db/client.ts";

// Auth
export { verifyRequest }                        from "./auth/verify-jwt.ts";
export { assertRole }                           from "./auth/assert-role.ts";
export {
  assertOrgTenant,
  assertVendorTenant,
  assertTechnicianScope,
}                                               from "./auth/assert-tenant.ts";
export { can, getPermissionsForRole }           from "./auth/permission-check.ts";
export type { AppClaims, UserRole, RequestContext, TenantType } from "./auth/types.ts";

// Validation
export { parseBody, parseValue, z }             from "./validation/schema-validator.ts";
export {
  uuidSchema,
  optionalUuidSchema,
  emailSchema,
  paginationSchema,
  isoDateSchema,
  dateOnlySchema,
  ticketPrioritySchema,
  entityStatusSchema,
  nonEmptyString,
  scoreSchema,
}                                               from "./validation/common-validators.ts";

// Response
export { respond, corsPreflightResponse }       from "./response/response-helpers.ts";

// Errors
export {
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  TenantMismatchError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  InternalError,
}                                               from "./errors/app-error.ts";
export { handleError }                          from "./errors/error-handler.ts";

// Logging
export { createLogger }                         from "./logging/logger.ts";
export { extractOrGenerateCorrelationId, attachCorrelationId } from "./logging/correlation.ts";
export type { Logger }                          from "./logging/logger.ts";

// Events
export { publishEvent, publishEvents, markEventProcessed, markEventFailed } from "./events/publisher.ts";
export { EVENTS }                               from "./events/event-types.ts";
export type {
  EventName,
  TicketCreatedPayload,
  TicketAssignedPayload,
  EvidenceUploadedPayload,
  PmDueTodayPayload,
  AnyEventPayload,
}                                               from "./events/event-types.ts";

// Retry
export { withRetry, retryOnTransient, retryOnRateLimit } from "./retry/retry.ts";
export type { RetryOptions }                    from "./retry/retry.ts";

// Storage
export { storagePaths, BUCKETS, ALLOWED_MIME_TYPES, MAX_FILE_SIZES } from "./storage/path-builder.ts";
export { createSignedUrl, getPublicUrl, deleteObjects, moveObject }  from "./storage/storage-client.ts";
export type { BucketName }                      from "./storage/path-builder.ts";

// Utils
export { generateUuid, isValidUuid }            from "./utils/uuid-helpers.ts";
export { nowUtc, addMinutes, addHours, addDays, isExpired, diffInMinutes, toDateString } from "./utils/date-helpers.ts";
export { parsePagination, toSupabaseRange, buildPaginatedResult } from "./utils/pagination-helpers.ts";
export { buildReferenceNumber, truncate, normalizeWhitespace }    from "./utils/string-helpers.ts";
export { sha256, generateSecureToken, safeEqual }                 from "./utils/crypto-helpers.ts";
