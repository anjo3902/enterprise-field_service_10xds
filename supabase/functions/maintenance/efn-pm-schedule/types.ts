/**
 * maintenance/efn-pm-schedule/types.ts
 */

export interface PmScheduleResult {
  action:       "generate" | "skip" | "reschedule";
  schedule_ids?: string[]; // for generate
  schedule_id?:  string;   // for skip/reschedule
  status:       string;
}
