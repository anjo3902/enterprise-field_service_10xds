/**
 * workorder/efn-wo-materials/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

export const MaterialActionSchema = z.object({
  action:              z.enum(["reserve", "consume", "release"]),
  work_order_id:       uuidSchema,
  part_name:           nonEmptyString.max(200),
  part_number:         z.string().max(100).optional(),
  quantity:            z.number().positive().max(99999),
  unit_cost:           z.number().nonnegative().optional(),
  supplier_vendor_id:  uuidSchema.optional(),
  // For release action — identify the part record to remove
  part_id:             uuidSchema.optional(),
}).refine(
  (d) => d.action !== "release" || d.part_id !== undefined,
  { message: "part_id required for release action" },
);

export type MaterialActionInput = z.infer<typeof MaterialActionSchema>;
