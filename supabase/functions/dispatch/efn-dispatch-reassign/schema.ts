/**
 * dispatch/efn-dispatch-reassign/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

export const DispatchReassignSchema = z.object({
  dispatch_schedule_id:  uuidSchema,
  new_technician_id:     uuidSchema,
  new_vendor_id:         uuidSchema.optional(),
  new_scheduled_start_at: z.string().datetime({ offset: true }).optional(),
  new_scheduled_end_at:   z.string().datetime({ offset: true }).optional(),
  reason:                nonEmptyString.max(500),
}).refine(
  (d) => !d.new_scheduled_start_at || !d.new_scheduled_end_at || new Date(d.new_scheduled_end_at) > new Date(d.new_scheduled_start_at),
  { message: "new_scheduled_end_at must be after new_scheduled_start_at" },
);

export type DispatchReassignInput = z.infer<typeof DispatchReassignSchema>;
