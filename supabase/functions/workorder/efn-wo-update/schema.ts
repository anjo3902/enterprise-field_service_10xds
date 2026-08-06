/**
 * workorder/efn-wo-update/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

const WO_STATUSES = ["open", "in_progress", "completed", "closed"] as const;

export const UpdateWorkOrderSchema = z.object({
  work_order_id:           uuidSchema,
  priority:                z.enum(["Critical", "High", "Medium", "Low"]).optional(),
  status:                  z.enum(WO_STATUSES).optional(),
  scheduled_start_at:      z.string().datetime({ offset: true }).optional(),
  scheduled_end_at:        z.string().datetime({ offset: true }).optional(),
  estimated_duration_mins: z.number().int().min(1).max(2880).optional(),
  resolution_summary:      z.string().max(5000).optional(),
  root_cause:              z.string().max(5000).optional(),
  follow_up_required:      z.boolean().optional(),
  follow_up_notes:         z.string().max(2000).optional(),
  reason:                  z.string().max(500).optional(),
}).refine(
  (d) => Object.keys(d).filter((k) => k !== "work_order_id" && k !== "reason").some((k) => d[k as keyof typeof d] !== undefined),
  { message: "At least one field to update must be provided" },
);

export type UpdateWorkOrderInput = z.infer<typeof UpdateWorkOrderSchema>;
