/**
 * technician/efn-tech-skills/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString, dateOnlySchema } from "../../shared/validation/common-validators.ts";

export const UpsertSkillSchema = z.object({
  action:              z.literal("upsert_skill"),
  technician_id:       uuidSchema,
  service_category_id: uuidSchema,
  service_type_id:     uuidSchema.optional(),
  skill_level:         z.number().int().min(1).max(5).optional(),
  years_experience:    z.number().min(0).max(100).optional(),
  is_primary:          z.boolean().default(false),
});

export const RemoveSkillSchema = z.object({
  action:        z.literal("remove_skill"),
  technician_id: uuidSchema,
  skill_id:      uuidSchema,
});

export const UpsertCertSchema = z.object({
  action:             z.literal("upsert_cert"),
  technician_id:      uuidSchema,
  certification_id:   uuidSchema,
  issue_date:         dateOnlySchema.optional(),
  expiry_date:        dateOnlySchema.optional(),
  certificate_number: nonEmptyString.max(200).optional(),
});

export const RemoveCertSchema = z.object({
  action:             z.literal("remove_cert"),
  technician_id:      uuidSchema,
  technician_cert_id: uuidSchema,
});

export const TechSkillActionSchema = z.discriminatedUnion("action", [
  UpsertSkillSchema,
  RemoveSkillSchema,
  UpsertCertSchema,
  RemoveCertSchema,
]);

export type TechSkillActionInput = z.infer<typeof TechSkillActionSchema>;
