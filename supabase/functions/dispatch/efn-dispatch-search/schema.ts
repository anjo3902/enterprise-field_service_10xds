/**
 * dispatch/efn-dispatch-search/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const DispatchSearchSchema = z.object({
  org_id:          uuidSchema.optional(),
  vendor_id:       uuidSchema.optional(),
  technician_id:   uuidSchema.optional(),
  work_order_id:   uuidSchema.optional(),
  dispatch_status: z.enum(["scheduled", "dispatched", "accepted", "rejected", "completed", "cancelled"]).optional(),
  route_status:    z.enum(["pending", "confirmed", "en_route", "arrived", "cancelled"]).optional(),
  from_date:       z.string().datetime({ offset: true }).optional(),
  to_date:         z.string().datetime({ offset: true }).optional(),
  overdue_only:    z.boolean().optional(),
  sort_by:         z.enum(["scheduled_start_at", "created_at"]).default("scheduled_start_at"),
  sort_dir:        z.enum(["asc", "desc"]).default("asc"),
  limit:           z.number().int().min(1).max(200).default(50),
  offset:          z.number().int().min(0).default(0),
});

export type DispatchSearchInput = z.infer<typeof DispatchSearchSchema>;
