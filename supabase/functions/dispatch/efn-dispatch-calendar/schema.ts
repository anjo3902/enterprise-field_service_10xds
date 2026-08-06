/**
 * dispatch/efn-dispatch-calendar/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const DispatchCalendarSchema = z.object({
  technician_id: uuidSchema.optional(),
  vendor_id:     uuidSchema.optional(),
  org_id:        uuidSchema.optional(),
  period_start:  z.string().datetime({ offset: true }).optional(),
  period_end:    z.string().datetime({ offset: true }).optional(),
  include:       z.array(z.enum(["shifts", "dispatches", "leaves", "holidays"]))
                   .default(["shifts", "dispatches", "holidays"]),
});

export type DispatchCalendarInput = z.infer<typeof DispatchCalendarSchema>;
