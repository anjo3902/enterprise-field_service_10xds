/**
 * vendor/efn-vendor-update/schema.ts
 * All fields optional — partial PATCH.
 * system_admin-only fields (status, sla_target) guarded in handler.
 */

import { z }          from "../../shared/validation/schema-validator.ts";
import { uuidSchema, emailSchema, nonEmptyString, dateOnlySchema } from "../../shared/validation/common-validators.ts";

const SERVICE_DOMAIN_VALUES = [
  "HVAC", "ELECTRICAL", "PLUMBING", "FIRE_SAFETY", "MECHANICAL",
  "IT_SYSTEMS", "SECURITY_SYSTEMS", "CIVIL_WORKS", "ELEVATORS",
] as const;

export const UpdateVendorSchema = z.object({
  vendor_id:         uuidSchema,

  // Profile
  name:              nonEmptyString.min(2).max(200).optional(),
  logo_url:          z.string().url().optional(),

  // Service configuration
  trade_domains:     z.array(z.enum(SERVICE_DOMAIN_VALUES)).min(1).optional(),
  service_regions:   z.array(z.string().max(100)).optional(),

  // Manager / Contact
  manager_name:      nonEmptyString.max(200).optional(),
  manager_email:     emailSchema.optional(),
  manager_phone:     z.string().max(30).optional(),

  // Legal
  license_number:    z.string().max(100).optional(),
  license_expiry:    dateOnlySchema.optional(),
  contract_id:       z.string().max(100).optional(),
  certifications:    z.array(z.object({
    name:       z.string().max(100),
    expiry:     dateOnlySchema.optional(),
    authority:  z.string().max(100).optional(),
    doc_url:    z.string().url().optional(),
  })).optional(),

  // Status & performance (system_admin only — enforced in handler)
  status:            z.enum(["active", "suspended", "pending_approval", "inactive"]).optional(),
  suspended_reason:  z.string().max(500).optional(),
  sla_target:        z.number().min(0).max(100).optional(),
}).refine(
  (d) => Object.keys(d).filter((k) => k !== "vendor_id").some((k) => d[k as keyof typeof d] !== undefined),
  { message: "At least one field to update must be provided" },
);

export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>;
