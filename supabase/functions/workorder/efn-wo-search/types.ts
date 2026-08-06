/**
 * workorder/efn-wo-search/types.ts
 */

export interface WoSearchResult {
  data:   WoSearchItem[];
  total:  number;
  limit:  number;
  offset: number;
}

export interface WoSearchItem {
  id:                string;
  work_order_number: string;
  ticket_id:         string;
  org_id:            string;
  vendor_id:         string | null;
  technician_id:     string | null;
  asset_id:          string | null;
  priority:          string;
  status:            string;
  scheduled_start_at: string | null;
  scheduled_end_at:   string | null;
  created_at:        string;
}
