/**
 * dispatch/efn-dispatch-assign/types.ts
 */

export interface DispatchAssignResult {
  dispatch_schedule_id: string;
  work_order_id:        string;
  technician_id:        string;
  vendor_id?:           string;
  scheduled_start_at:   string;
  scheduled_end_at:     string;
  estimated_travel_mins?: number;
  dispatch_status:      string;
  created_at:           string;
}
