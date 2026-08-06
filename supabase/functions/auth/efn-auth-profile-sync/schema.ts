/**
 * auth/efn-auth-profile-sync/schema.ts
 * ─────────────────────────────────────────────────────────────────
 * Zod schema for the Supabase DB Webhook payload.
 */

import { z } from "../../shared/validation/schema-validator.ts";

const AuthUserSchema = z.object({
  id:                 z.string().uuid(),
  email:              z.string().email().nullable().optional(),
  phone:              z.string().nullable().optional(),
  created_at:         z.string(),
  raw_user_meta_data: z.record(z.unknown()).default({}),
  raw_app_meta_data:  z.record(z.unknown()).default({}),
});

export const DbWebhookPayloadSchema = z.object({
  type:       z.enum(["INSERT", "UPDATE", "DELETE"]),
  table:      z.string(),
  schema:     z.string(),
  record:     AuthUserSchema.nullable(),
  old_record: AuthUserSchema.nullable().optional(),
});

export type DbWebhookPayloadInput = z.infer<typeof DbWebhookPayloadSchema>;
