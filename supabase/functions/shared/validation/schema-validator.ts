/**
 * validation/schema-validator.ts
 * ─────────────────────────────────────────────────────────────────
 * Zod-based schema validation engine.
 * Parses incoming request bodies and query params against a Zod schema.
 * On failure, throws a typed ValidationError with field-level details.
 *
 * Usage:
 *   import { parseBody } from "../shared/validation/schema-validator.ts";
 *   import { CreateTicketSchema } from "./schema.ts";
 *
 *   const body = await parseBody(req, CreateTicketSchema, correlationId);
 */

import { z, ZodError, ZodSchema } from "zod";
import { ValidationError } from "../errors/app-error.ts";

export { z };
export type { ZodSchema };

// ── JSON Body Parser ───────────────────────────────────────────────

/**
 * Reads the request body as JSON and validates it against the schema.
 * Throws ValidationError with field-level errors on failure.
 */
export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>,
  correlationId?: string,
): Promise<T> {
  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON", correlationId);
  }

  return parseValue(raw, schema, correlationId);
}

// ── Generic Value Parser ───────────────────────────────────────────

/**
 * Validates any value against a Zod schema.
 * Throws ValidationError on failure.
 */
export function parseValue<T>(
  value: unknown,
  schema: ZodSchema<T>,
  correlationId?: string,
): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    const fieldErrors = flattenZodErrors(result.error);
    throw new ValidationError(
      "Request validation failed",
      correlationId,
      fieldErrors,
    );
  }

  return result.data;
}

// ── Zod Error Flattener ────────────────────────────────────────────

function flattenZodErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    if (!out[key]) out[key] = [];
    out[key].push(issue.message);
  }
  return out;
}
