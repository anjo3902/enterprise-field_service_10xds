/**
 * workorder/efn-wo-time/types.ts
 */

export type TimeAction =
  | "travel_start" | "travel_end"
  | "clock_in"     | "clock_out"
  | "work_start"   | "work_stop"
  | "break_start"  | "break_end";

export interface TimeResult {
  work_order_id:  string;
  labor_id:       string;
  action:         TimeAction;
  recorded_at:    string;
  hours_worked?:  number;
  travel_hours?:  number;
}
