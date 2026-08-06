/**
 * dispatch/efn-dispatch-search/types.ts
 */

export interface DispatchSearchResult {
  data:   DispatchSearchItem[];
  total:  number;
  limit:  number;
  offset: number;
}

export interface DispatchSearchItem {
  id:                  string;
  work_order_id:       string;
  technician_id:       string;
  vendor_id:           string | null;
  scheduled_start_at:  string;
  scheduled_end_at:    string;
  dispatch_status:     string;
  route_status:        string;
  estimated_travel_mins: number | null;
  created_at:          string;
}
