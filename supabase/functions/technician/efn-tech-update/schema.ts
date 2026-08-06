/**
 * technician/efn-tech-update/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, emailSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const SERVICE_DOMAIN_VALUES = [
  "HVAC", "ELECTRICAL", "PLUMBING", "FIRE_SAFETY", "MECHANICAL",
  "IT_SYSTEMS", "SECURITY_SYSTEMS", "CIVIL_WORKS", "ELEVATORS",
] as const;

export const UpdateTechnicianSchema = z.object({
  technician_id:      uuidSchema,
  full_name:          nonEmptyString.max(200).optional(),
  first_name:         z.string().max(100).optional(),
  last_name:          z.string().max(100).optional(),
  email:              emailSchema.optional(),
  phone:              z.string().max(30).optional(),
  employee_id:        z.string().max(100).optional(),
  primary_domain:     z.enum(SERVICE_DOMAIN_VALUES).optional(),
  secondary_domains:  z.array(z.enum(SERVICE_DOMAIN_VALUES)).optional(),
  skills:             z.array(z.string().max(100)).optional(),
  experience_level:   z.enum(["apprentice", "technician", "senior", "master"]).optional(),
  years_experience:   z.number().min(0).max(100).optional(),
  status:             z.enum(["active", "inactive"]).optional(), // vendor_admin/system_admin only
  working_hours_start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  working_hours_end:   z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  working_days:        z.array(z.enum(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"])).optional(),
}).refine(
  (d) => Object.keys(d).filter((k) => k !== "technician_id").some((k) => d[k as keyof typeof d] !== undefined),
  { message: "At least one field to update must be provided" },
);

export type UpdateTechnicianInput = z.infer<typeof UpdateTechnicianSchema>;
