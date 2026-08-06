/**
 * dispatch/efn-dispatch-assign/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const DispatchAssignSchema = z.object({
  work_order_id:        uuidSchema,
  technician_id:        uuidSchema,
  vendor_id:            uuidSchema.optional(),
  scheduled_start_at:   z.string().datetime({ offset: true }),
  scheduled_end_at:     z.string().datetime({ offset: true }),
  estimated_travel_mins: z.number().int().min(0).max(480).optional(),
  notes:                z.string().max(1000).optional(),
  skip_availability_check: z.boolean().default(false), // Emergency override flag
}).refine(
  (d) => new Date(d.scheduled_end_at) > new Date(d.scheduled_start_at),
  { message: "scheduled_end_at must be after scheduled_start_at", path: ["scheduled_end_at"] },
);

export type DispatchAssignInput = z.infer<typeof DispatchAssignSchema>;
