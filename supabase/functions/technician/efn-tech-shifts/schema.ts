/**
 * technician/efn-tech-shifts/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const CreateShiftSchema = z.object({
  action:              z.literal("create"),
  technician_id:       uuidSchema,
  shift_name:          nonEmptyString.max(100),
  start_time:          z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/),
  end_time:            z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/),
  break_duration_mins: z.number().int().min(0).max(480).default(0),
  working_days:        z.array(z.number().int().min(0).max(6)).min(1),
  timezone:            z.string().max(100).default("UTC"),
});

const UpdateShiftSchema = z.object({
  action:              z.literal("update"),
  technician_id:       uuidSchema,
  shift_id:            uuidSchema,
  shift_name:          nonEmptyString.max(100).optional(),
  start_time:          z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).optional(),
  end_time:            z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).optional(),
  break_duration_mins: z.number().int().min(0).max(480).optional(),
  working_days:        z.array(z.number().int().min(0).max(6)).min(1).optional(),
  timezone:            z.string().max(100).optional(),
});

const RemoveShiftSchema = z.object({
  action:        z.literal("remove"),
  technician_id: uuidSchema,
  shift_id:      uuidSchema,
});

export const ShiftActionSchema = z.discriminatedUnion("action", [
  CreateShiftSchema,
  UpdateShiftSchema,
  RemoveShiftSchema,
]);

export type ShiftActionInput = z.infer<typeof ShiftActionSchema>;
