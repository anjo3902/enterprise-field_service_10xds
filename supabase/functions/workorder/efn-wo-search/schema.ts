/**
 * workorder/efn-wo-search/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

const WO_STATUSES = ["open", "in_progress", "completed", "closed"] as const;

export const WoSearchSchema = z.object({
  org_id:           uuidSchema.optional(),
  ticket_id:        uuidSchema.optional(),
  vendor_id:        uuidSchema.optional(),
  technician_id:    uuidSchema.optional(),
  asset_id:         uuidSchema.optional(),
  status:           z.enum(WO_STATUSES).optional(),
  priority:         z.enum(["Critical", "High", "Medium", "Low"]).optional(),
  search_term:      z.string().max(100).optional(),
  overdue_only:     z.boolean().optional(),
  sort_by:          z.enum(["created_at", "scheduled_start_at", "priority"]).default("created_at"),
  sort_dir:         z.enum(["asc", "desc"]).default("desc"),
  limit:            z.number().int().min(1).max(100).default(50),
  offset:           z.number().int().min(0).default(0),
});

export type WoSearchInput = z.infer<typeof WoSearchSchema>;
