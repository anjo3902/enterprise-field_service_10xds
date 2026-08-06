/**
 * technician/efn-tech-shifts/types.ts
 */

export type ShiftAction = "create" | "update" | "remove";

export interface ShiftActionInput {
  action:              ShiftAction;
  technician_id:       string;
  shift_id?:           string; // Required for update/remove
  shift_name?:         string;
  start_time?:         string;
  end_time?:           string;
  break_duration_mins?: number;
  working_days?:       number[];
  timezone?:           string;
}

export interface ShiftResult {
  technician_id: string;
  shift_id:      string;
  action:        ShiftAction;
}
