/**
 * ticket/efn-ticket-search/types.ts
 */

export interface TicketSearchResult {
  data:   TicketSearchItem[];
  total:  number;
  limit:  number;
  offset: number;
}

export interface TicketSearchItem {
  id:            string;
  ticket_number: string;
  title:         string;
  priority:      string;
  status:        string;
  org_id:        string;
  vendor_id:     string | null;
  asset_id:      string | null;
  created_at:    string;
  resolution_due_at: string | null;
  response_sla_status: string | null;
  resolution_sla_status: string | null;
}
