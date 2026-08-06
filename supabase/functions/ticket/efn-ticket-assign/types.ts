/**
 * ticket/efn-ticket-assign/types.ts
 */

export type AssignAction = "assign" | "reassign" | "unassign";

export interface TicketAssignResult {
  ticket_id:         string;
  assignment_id:     string;
  action:            AssignAction;
  vendor_id?:        string;
  technician_id?:    string;
  assignment_status: string;
  assigned_at:       string;
}
