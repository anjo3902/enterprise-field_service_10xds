/**
 * workorder/efn-wo-time/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const TimeActionSchema = z.object({
  work_order_id:  uuidSchema,
  technician_id:  uuidSchema, // Explicit to support dispatcher-initiated clock-in
  action:         z.enum([
    "travel_start", "travel_end",
    "clock_in",     "clock_out",
    "work_start",   "work_stop",
    "break_start",  "break_end"
  ]),
  // Final labor entry — provided on clock_out / work_stop
  hours_worked:      z.number().nonnegative().optional(),
  travel_time_hours: z.number().nonnegative().optional(),
  overtime_hours:    z.number().nonnegative().optional(),
  labor_cost:        z.number().nonnegative().optional(),
  timestamp:         z.string().datetime({ offset: true }).optional(), // Defaults to server now
});

export type TimeActionInput = z.infer<typeof TimeActionSchema>;
