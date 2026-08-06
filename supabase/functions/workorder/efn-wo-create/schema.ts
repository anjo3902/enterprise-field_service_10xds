/**
 * workorder/efn-wo-create/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString, dateOnlySchema } from "../../shared/validation/common-validators.ts";

export const CreateWorkOrderSchema = z.object({
  ticket_id:               uuidSchema,
  org_id:                  uuidSchema,
  vendor_id:               uuidSchema.optional(),
  technician_id:           uuidSchema.optional(),
  asset_id:                uuidSchema.optional(),
  site_id:                 uuidSchema.optional(),
  building_id:             uuidSchema.optional(),
  floor_id:                uuidSchema.optional(),
  room_id:                 uuidSchema.optional(),
  service_category_id:     uuidSchema.optional(),
  service_type_id:         uuidSchema.optional(),
  priority:                z.enum(["Critical", "High", "Medium", "Low"]).default("Medium"),
  scheduled_start_at:      z.string().datetime({ offset: true }).optional(),
  scheduled_end_at:        z.string().datetime({ offset: true }).optional(),
  estimated_duration_mins: z.number().int().min(1).max(2880).optional(), // Max 48 hours
}).refine(
  (d) => !d.scheduled_start_at || !d.scheduled_end_at || new Date(d.scheduled_end_at) > new Date(d.scheduled_start_at),
  { message: "scheduled_end_at must be after scheduled_start_at", path: ["scheduled_end_at"] },
);

export type CreateWorkOrderInput = z.infer<typeof CreateWorkOrderSchema>;
