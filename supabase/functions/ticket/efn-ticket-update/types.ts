/**
 * ticket/efn-ticket-update/types.ts
 */

export interface UpdateTicketResult {
  ticket_id:    string;
  updated_at:   string;
  changes:      string[];
  status_changed: boolean;
}
