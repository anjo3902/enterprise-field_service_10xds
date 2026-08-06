/**
 * auth/efn-auth-jwt-hook/schema.ts
 * ─────────────────────────────────────────────────────────────────
 * Zod validation schema for the Supabase JWT Hook payload.
 */

import { z } from "../../shared/validation/schema-validator.ts";

export const JwtHookPayloadSchema = z.object({
  user_id: z.string().uuid("user_id must be a valid UUID"),
  claims: z.object({
    aud:           z.string(),
    exp:           z.number(),
    iat:           z.number(),
    iss:           z.string(),
    sub:           z.string(),
    email:         z.string().optional(),
    phone:         z.string().optional(),
    role:          z.string(),
    session_id:    z.string().optional(),
    app_metadata:  z.record(z.unknown()).default({}),
    user_metadata: z.record(z.unknown()).default({}),
  }),
});

export type JwtHookPayloadInput = z.infer<typeof JwtHookPayloadSchema>;
