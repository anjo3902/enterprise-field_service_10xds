/**
 * workorder/efn-wo-history/types.ts
 */

export interface WoHistoryResult {
  work_order_id:    string;
  work_order_number: string;
  tasks:            TaskItem[];
  labor:            LaborItem[];
  parts:            PartItem[];
  checklist:        ChecklistItem[];
  activity:         ActivityItem[];
}

export interface TaskItem {
  id: string; task_name: string; is_mandatory: boolean;
  is_completed: boolean; completed_by: string | null; completed_at: string | null;
}
export interface LaborItem {
  id: string; technician_id: string; hours_worked: number;
  travel_time_hours: number; overtime_hours: number; labor_cost: number | null;
}
export interface PartItem {
  id: string; part_name: string; part_number: string | null;
  quantity: number; unit_cost: number | null; total_cost: number | null;
}
export interface ChecklistItem {
  id: string; checklist_item_id: string; value: string | null;
  remarks: string | null; completed_by: string | null; completed_at: string | null;
}
export interface ActivityItem {
  id: string; activity_type: string; description: string;
  performed_by_id: string | null; occurred_at: string;
}
