/**
 * maintenance/efn-pm-schedule/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const PmScheduleSchema = z.object({
  action:         z.enum(["generate", "skip", "reschedule"]),
  plan_id:        uuidSchema.optional(), // Required for generate
  target_date:    z.string().date().optional(), // Up to what date to generate
  schedule_id:    uuidSchema.optional(), // Required for skip/reschedule
  reason:         z.string().max(500).optional(), // Required for skip/reschedule
  new_date:       z.string().date().optional(), // Required for reschedule
}).refine(
  (d) => {
    if (d.action === "generate") return !!d.plan_id && !!d.target_date;
    if (d.action === "reschedule") return !!d.schedule_id && !!d.reason && !!d.new_date;
    if (d.action === "skip") return !!d.schedule_id && !!d.reason;
    return false;
  },
  { message: "Invalid combination of fields for the requested action" }
);

export type PmScheduleInput = z.infer<typeof PmScheduleSchema>;
