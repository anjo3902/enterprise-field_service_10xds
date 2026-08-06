/**
 * workorder/efn-wo-status/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

const WO_STATUSES = ["open", "in_progress", "completed", "closed"] as const;

export const WoStatusSchema = z.object({
  work_order_id: uuidSchema,
  new_status:    z.enum(WO_STATUSES),
  reason:        z.string().max(500).optional(),
});

export type WoStatusInput = z.infer<typeof WoStatusSchema>;
