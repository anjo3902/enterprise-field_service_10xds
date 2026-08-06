/**
 * organization/efn-org-update/schema.ts
 * ─────────────────────────────────────────────────────────────────
 * Zod schema for PATCH /organization/:org_id
 * All fields are optional — partial updates are allowed.
 */

import { z }          from "../../shared/validation/schema-validator.ts";
import { uuidSchema, emailSchema, nonEmptyString, dateOnlySchema } from "../../shared/validation/common-validators.ts";

export const UpdateOrgSchema = z.object({
  org_id:                     uuidSchema,

  // Profile
  name:                       nonEmptyString.min(3).max(200).optional(),
  industry:                   z.string().max(100).optional(),
  description:                z.string().max(1000).optional(),
  logo_url:                   z.string().url().optional(),

  // Admin contact
  admin_name:                 nonEmptyString.max(200).optional(),
  admin_email:                emailSchema.optional(),
  admin_phone:                z.string().max(20).optional(),

  // Geography & locale
  region:                     z.string().max(100).optional(),
  city:                       z.string().max(100).optional(),
  country:                    z.string().max(100).optional(),
  timezone:                   z.string().max(100).optional(),
  language:                   z.string().length(2).optional(),

  // License (system_admin only — enforced in handler)
  plan:                       z.enum(["trial", "professional", "enterprise"]).optional(),
  license_seats_users:        z.number().int().min(1).max(10000).optional(),
  license_seats_vendors:      z.number().int().min(1).max(1000).optional(),
  license_seats_technicians:  z.number().int().min(1).max(50000).optional(),
  subscription_renewal:       dateOnlySchema.optional(),

  // Status transitions (system_admin only — enforced in handler)
  status:                     z.enum(["active", "suspended", "pending_setup", "inactive"]).optional(),
  suspended_reason:           z.string().max(500).optional(),
}).refine(
  (d) => Object.keys(d).filter((k) => k !== "org_id").some((k) => d[k as keyof typeof d] !== undefined),
  { message: "At least one field to update must be provided" },
);

export type UpdateOrgInput = z.infer<typeof UpdateOrgSchema>;
