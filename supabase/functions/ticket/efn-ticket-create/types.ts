/**
 * ticket/efn-ticket-create/types.ts
 */

export type TicketPriority = "Critical" | "High" | "Medium" | "Low";

export type TicketStatus =
  | "open" | "pending_vendor_review" | "approved" | "assigned"
  | "technician_accepted" | "travelling" | "arrived" | "checked_in"
  | "on_site" | "in_progress" | "work_order_generated" | "completed"
  | "report_submitted" | "vendor_review" | "org_acceptance" | "closed"
  | "rejected" | "reassigned" | "escalated" | "cancelled";

export interface CreateTicketResult {
  ticket_id:     string;
  ticket_number: string;
  org_id:        string;
  status:        TicketStatus;
  priority:      TicketPriority;
  created_at:    string;
}
