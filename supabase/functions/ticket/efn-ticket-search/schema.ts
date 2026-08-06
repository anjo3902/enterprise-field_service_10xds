/**
 * ticket/efn-ticket-search/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

const TICKET_STATUSES = [
  "open", "pending_vendor_review", "approved", "assigned",
  "technician_accepted", "travelling", "arrived", "checked_in",
  "on_site", "in_progress", "work_order_generated", "completed",
  "report_submitted", "vendor_review", "org_acceptance", "closed",
  "rejected", "reassigned", "escalated", "cancelled"
] as const;

export const TicketSearchSchema = z.object({
  org_id:               uuidSchema.optional(),
  search_term:          z.string().max(100).optional(),
  status:               z.enum(TICKET_STATUSES).optional(),
  priority:             z.enum(["Critical", "High", "Medium", "Low"]).optional(),
  vendor_id:            uuidSchema.optional(),
  asset_id:             uuidSchema.optional(),
  assigned_technician_id: uuidSchema.optional(),
  service_category_id:  uuidSchema.optional(),
  sla_breached:         z.boolean().optional(), // Filter only breached tickets
  sort_by:              z.enum(["created_at", "resolution_due_at", "priority", "status"]).default("created_at"),
  sort_dir:             z.enum(["asc", "desc"]).default("desc"),
  limit:                z.number().int().min(1).max(100).default(50),
  offset:               z.number().int().min(0).default(0),
});

export type TicketSearchInput = z.infer<typeof TicketSearchSchema>;
