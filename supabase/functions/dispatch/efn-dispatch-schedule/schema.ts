/**
 * dispatch/efn-dispatch-schedule/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const CreateScheduleSchema = z.object({
  action:              z.literal("create"),
  work_order_id:       uuidSchema,
  technician_id:       uuidSchema,
  vendor_id:           uuidSchema.optional(),
  scheduled_start_at:  z.string().datetime({ offset: true }),
  scheduled_end_at:    z.string().datetime({ offset: true }),
  estimated_travel_mins: z.number().int().min(0).max(480).optional(),
  check_business_hours: z.boolean().default(true),
  check_holidays:       z.boolean().default(true),
}).refine(
  (d) => new Date(d.scheduled_end_at) > new Date(d.scheduled_start_at),
  { message: "scheduled_end_at must be after scheduled_start_at" }
);

const UpdateScheduleSchema = z.object({
  action:              z.literal("update"),
  schedule_id:         uuidSchema,
  scheduled_start_at:  z.string().datetime({ offset: true }).optional(),
  scheduled_end_at:    z.string().datetime({ offset: true }).optional(),
  estimated_travel_mins: z.number().int().min(0).max(480).optional(),
  notes:               z.string().max(500).optional(),
});

const CancelScheduleSchema = z.object({
  action:      z.literal("cancel"),
  schedule_id: uuidSchema,
  reason:      nonEmptyString.max(500),
});

export const DispatchScheduleSchema = z.discriminatedUnion("action", [
  CreateScheduleSchema,
  UpdateScheduleSchema,
  CancelScheduleSchema,
]);

export type DispatchScheduleInput = z.infer<typeof DispatchScheduleSchema>;
