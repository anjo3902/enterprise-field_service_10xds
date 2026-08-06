/**
 * ticket/efn-ticket-update/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const TICKET_STATUSES = [
  "open", "pending_vendor_review", "approved", "assigned",
  "technician_accepted", "travelling", "arrived", "checked_in",
  "on_site", "in_progress", "work_order_generated", "completed",
  "report_submitted", "vendor_review", "org_acceptance", "closed",
  "rejected", "reassigned", "escalated", "cancelled"
] as const;

export const UpdateTicketSchema = z.object({
  ticket_id:            uuidSchema,
  title:                nonEmptyString.max(300).optional(),
  description:          z.string().max(5000).optional(),
  priority:             z.enum(["Critical", "High", "Medium", "Low"]).optional(),
  severity:             z.string().max(100).optional(),
  status:               z.enum(TICKET_STATUSES).optional(),
  resolution_summary:   z.string().max(5000).optional(),
  root_cause:           z.string().max(5000).optional(),
  asset_id:             uuidSchema.optional(),
  service_category_id:  uuidSchema.optional(),
  service_type_id:      uuidSchema.optional(),
  sla_policy_id:        uuidSchema.optional(),
  reason:               z.string().max(500).optional(), // Reason for status change
}).refine(
  (d) => Object.keys(d).filter((k) => k !== "ticket_id" && k !== "reason").some((k) => d[k as keyof typeof d] !== undefined),
  { message: "At least one field to update must be provided" },
);

export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;
