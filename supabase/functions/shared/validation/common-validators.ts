/**
 * validation/common-validators.ts
 * ─────────────────────────────────────────────────────────────────
 * Reusable Zod schema fragments shared across all Edge Function schemas.
 *
 * Usage:
 *   import { uuidSchema, emailSchema, paginationSchema } from "../shared/validation/common-validators.ts";
 *   import { z } from "../shared/validation/schema-validator.ts";
 *
 *   const CreateTicketSchema = z.object({
 *     org_id: uuidSchema,
 *     title:  z.string().min(5).max(500),
 *   });
 */

import { z } from "./schema-validator.ts";

// ── UUID ──────────────────────────────────────────────────────────

export const uuidSchema = z
  .string()
  .uuid({ message: "Must be a valid UUID v4" });

export const optionalUuidSchema = uuidSchema.nullable().optional();

// ── Email ─────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .email({ message: "Must be a valid email address" })
  .max(320, "Email must not exceed 320 characters")
  .toLowerCase();

// ── Pagination ────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ── Date strings ──────────────────────────────────────────────────

export const isoDateSchema = z
  .string()
  .datetime({ message: "Must be an ISO 8601 datetime string" });

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format");

// ── Common enums ──────────────────────────────────────────────────

export const ticketPrioritySchema = z.enum(["Critical", "High", "Medium", "Low"]);

export const entityStatusSchema = z.enum(["active", "inactive", "suspended", "pending_setup"]);

// ── Non-empty trimmed string ──────────────────────────────────────

export const nonEmptyString = z
  .string()
  .trim()
  .min(1, "Field must not be empty");

// ── Numeric range ─────────────────────────────────────────────────

export const scoreSchema = z
  .number()
  .min(0, "Score must be >= 0")
  .max(1, "Score must be <= 1");

export const percentSchema = z
  .number()
  .min(0, "Percentage must be >= 0")
  .max(100, "Percentage must be <= 100");

// ── Phone number (basic format) ───────────────────────────────────

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, "Must be a valid phone number")
  .optional();

// ── URL ───────────────────────────────────────────────────────────

export const urlSchema = z.string().url("Must be a valid URL").optional();
