/**
 * technician/efn-tech-create/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, emailSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const SERVICE_DOMAIN_VALUES = [
  "HVAC", "ELECTRICAL", "PLUMBING", "FIRE_SAFETY", "MECHANICAL",
  "IT_SYSTEMS", "SECURITY_SYSTEMS", "CIVIL_WORKS", "ELEVATORS",
] as const;

export const CreateTechnicianSchema = z.object({
  vendor_id:          uuidSchema,
  full_name:          nonEmptyString.max(200),
  first_name:         z.string().max(100).optional(),
  last_name:          z.string().max(100).optional(),
  email:              emailSchema,
  phone:              z.string().max(30).optional(),
  employee_id:        z.string().max(100).optional(),
  primary_domain:     z.enum(SERVICE_DOMAIN_VALUES).optional(),
  secondary_domains:  z.array(z.enum(SERVICE_DOMAIN_VALUES)).optional(),
  skills:             z.array(z.string().max(100)).optional(),
  experience_level:   z.enum(["apprentice", "technician", "senior", "master"]).optional(),
  years_experience:   z.number().min(0).max(100).optional(),
});

export type CreateTechnicianInput = z.infer<typeof CreateTechnicianSchema>;
