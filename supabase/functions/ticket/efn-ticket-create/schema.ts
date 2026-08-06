/**
 * ticket/efn-ticket-create/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

export const CreateTicketSchema = z.object({
  org_id:               uuidSchema,
  title:                nonEmptyString.max(300),
  description:          z.string().max(5000).optional(),
  priority:             z.enum(["Critical", "High", "Medium", "Low"]).default("Medium"),
  severity:             z.string().max(100).optional(),
  asset_id:             uuidSchema.optional(),
  sla_policy_id:        uuidSchema.optional(),
  service_category_id:  uuidSchema.optional(),
  service_type_id:      uuidSchema.optional(),
  site_id:              uuidSchema.optional(),
  building_id:          uuidSchema.optional(),
  floor_id:             uuidSchema.optional(),
  room_id:              uuidSchema.optional(),
  business_unit_id:     uuidSchema.optional(),
  department_id:        uuidSchema.optional(),
  cost_center_id:       uuidSchema.optional(),
  requester_employee_id:uuidSchema.optional(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
