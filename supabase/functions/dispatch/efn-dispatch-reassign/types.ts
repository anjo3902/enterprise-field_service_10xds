/**
 * dispatch/efn-dispatch-reassign/types.ts
 */

export interface DispatchReassignResult {
  old_schedule_id:   string;
  new_schedule_id:   string;
  work_order_id:     string;
  new_technician_id: string;
  reason:            string;
  reassigned_at:     string;
}
