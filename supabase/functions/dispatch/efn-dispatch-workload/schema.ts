/**
 * dispatch/efn-dispatch-workload/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const DispatchWorkloadSchema = z.object({
  org_id:         uuidSchema.optional(),
  vendor_id:      uuidSchema.optional(),
  technician_id:  uuidSchema.optional(),
  period_start:   z.string().datetime({ offset: true }).optional(),
  period_end:     z.string().datetime({ offset: true }).optional(),
  max_hours_day:  z.number().int().min(1).max(24).default(8),  // Reference daily capacity
});

export type DispatchWorkloadInput = z.infer<typeof DispatchWorkloadSchema>;
