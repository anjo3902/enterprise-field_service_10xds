/**
 * ticket/efn-ticket-history/types.ts
 */

export interface TicketHistoryResult {
  ticket_id:      string;
  ticket_number:  string;
  status_history: StatusEvent[];
  assignments:    AssignmentEvent[];
  comments:       CommentEvent[];
}

export interface StatusEvent {
  id:              string;
  previous_status: string | null;
  new_status:      string;
  changed_by:      string | null;
  reason:          string | null;
  changed_at:      string;
}

export interface AssignmentEvent {
  id:                string;
  vendor_id:         string | null;
  technician_id:     string | null;
  assigned_by:       string | null;
  assignment_status: string;
  assigned_at:       string;
  reason:            string | null;
}

export interface CommentEvent {
  id:           string;
  body:         string;
  comment_type: string;
  visibility:   string;
  author_id:    string | null;
  created_at:   string;
}
