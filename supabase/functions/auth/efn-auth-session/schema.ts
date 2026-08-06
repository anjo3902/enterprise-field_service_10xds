/**
 * auth/efn-auth-session/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";

export const RevokeSessionSchema = z.object({
  all: z.boolean().optional().default(false),
});

export type RevokeSessionInput = z.infer<typeof RevokeSessionSchema>;
