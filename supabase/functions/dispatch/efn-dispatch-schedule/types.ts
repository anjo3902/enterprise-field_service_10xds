/**
 * dispatch/efn-dispatch-schedule/types.ts
 */

export type ScheduleAction = "create" | "update" | "cancel";

export interface ScheduleResult {
  action:              ScheduleAction;
  schedule_id:         string;
  work_order_id:       string;
  technician_id:       string;
  scheduled_start_at:  string;
  scheduled_end_at:    string;
  conflict_detected:   boolean;
  dispatch_status:     string;
}
