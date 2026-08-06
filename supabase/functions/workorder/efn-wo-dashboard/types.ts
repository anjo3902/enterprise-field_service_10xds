/**
 * workorder/efn-wo-dashboard/types.ts
 */

export interface WoDashboardResult {
  org_id: string;
  summary: {
    open:            number;
    in_progress:     number;
    completed_today: number;
    overdue:         number;
    total_active:    number;
  };
  priority: {
    critical: number;
    high:     number;
    medium:   number;
    low:      number;
  };
  labor: {
    total_hours_worked:   number;
    total_travel_hours:   number;
    total_overtime_hours: number;
  };
  materials: {
    total_parts_used:  number;
    total_cost:        number;
  };
}
