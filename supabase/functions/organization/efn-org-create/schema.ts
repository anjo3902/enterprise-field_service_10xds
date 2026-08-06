/**
 * organization/efn-org-create/schema.ts
 * ─────────────────────────────────────────────────────────────────
 * Zod validation schema for POST /organization/create.
 */

import { z }          from "../../shared/validation/schema-validator.ts";
import { emailSchema, nonEmptyString, dateOnlySchema } from "../../shared/validation/common-validators.ts";

export const CreateOrgSchema = z.object({
  name:                       nonEmptyString.min(3).max(200),
  industry:                   z.string().max(100).optional(),
  description:                z.string().max(1000).optional(),
  plan:                       z.enum(["trial", "professional", "enterprise"]),

  // Primary admin contact
  admin_name:                 nonEmptyString.max(200),
  admin_email:                emailSchema,
  admin_phone:                z.string().max(20).optional(),

  // Geography
  region:                     z.string().max(100).optional(),
  city:                       z.string().max(100).optional(),
  country:                    z.string().max(100).optional(),

  // Locale
  timezone:                   z.string().max(100).optional().default("UTC"),
  language:                   z.string().length(2).optional().default("en"),

  // License — if not provided, plan defaults are applied
  license_seats_users:        z.number().int().min(1).max(10000).optional(),
  license_seats_vendors:      z.number().int().min(1).max(1000).optional(),
  license_seats_technicians:  z.number().int().min(1).max(50000).optional(),
  subscription_renewal:       dateOnlySchema.optional(),
});

export type CreateOrgInput = z.infer<typeof CreateOrgSchema>;
