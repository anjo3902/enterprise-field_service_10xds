/**
 * workorder/efn-wo-assignment/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const WoAssignmentSchema = z.object({
  work_order_id: uuidSchema,
  action:        z.enum(["assign", "reassign", "unassign"]),
  vendor_id:     uuidSchema.optional(),
  technician_id: uuidSchema.optional(),
  reason:        z.string().max(500).optional(),
}).refine(
  (d) => d.action === "unassign" || d.vendor_id || d.technician_id,
  { message: "vendor_id or technician_id required for assign/reassign" },
);

export type WoAssignmentInput = z.infer<typeof WoAssignmentSchema>;
