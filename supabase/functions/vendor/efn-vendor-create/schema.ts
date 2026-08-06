/**
 * vendor/efn-vendor-create/schema.ts
 */

import { z }             from "../../shared/validation/schema-validator.ts";
import { emailSchema, nonEmptyString, dateOnlySchema } from "../../shared/validation/common-validators.ts";

const SERVICE_DOMAIN_VALUES = [
  "HVAC", "ELECTRICAL", "PLUMBING", "FIRE_SAFETY", "MECHANICAL",
  "IT_SYSTEMS", "SECURITY_SYSTEMS", "CIVIL_WORKS", "ELEVATORS",
] as const;

export const CreateVendorSchema = z.object({
  name:              nonEmptyString.min(2).max(200),
  trade_domains:     z.array(z.enum(SERVICE_DOMAIN_VALUES)).min(1, "At least one trade domain is required"),
  service_regions:   z.array(z.string().max(100)).optional(),
  manager_name:      nonEmptyString.max(200).optional(),
  manager_email:     emailSchema.optional(),
  manager_phone:     z.string().max(30).optional(),
  sla_target:        z.number().min(0).max(100).default(90.0),
  license_number:    z.string().max(100).optional(),
  license_expiry:    dateOnlySchema.optional(),
  contract_id:       z.string().max(100).optional(),
});

export type CreateVendorInput = z.infer<typeof CreateVendorSchema>;
