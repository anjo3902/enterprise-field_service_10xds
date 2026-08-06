/**
 * auth/efn-auth-password/schema.ts
 * ─────────────────────────────────────────────────────────────────
 * Zod schemas for all password management operations.
 */

import { z }                 from "../../shared/validation/schema-validator.ts";
import { emailSchema }       from "../../shared/validation/common-validators.ts";

// ── Discriminated union by action ─────────────────────────────────

export const ResetRequestSchema = z.object({
  action:       z.literal("reset_request"),
  email:        emailSchema,
  redirect_to:  z.string().url().optional(),
});

export const PasswordUpdateSchema = z.object({
  action:       z.literal("update"),
  new_password: z
    .string()
    .min(8,  "Password must be at least 8 characters")
    .max(72, "Password must not exceed 72 characters")
    .regex(/[A-Z]/,    "Password must contain at least one uppercase letter")
    .regex(/[a-z]/,    "Password must contain at least one lowercase letter")
    .regex(/[0-9]/,    "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const VerifyEmailSchema = z.object({
  action: z.literal("verify_email"),
  email:  emailSchema,
});

export const MagicLinkSchema = z.object({
  action:      z.literal("magic_link"),
  email:       emailSchema,
  redirect_to: z.string().url().optional(),
});

/** Union schema — discriminated by the `action` field. */
export const PasswordActionSchema = z.discriminatedUnion("action", [
  ResetRequestSchema,
  PasswordUpdateSchema,
  VerifyEmailSchema,
  MagicLinkSchema,
]);

export type PasswordActionInput = z.infer<typeof PasswordActionSchema>;
