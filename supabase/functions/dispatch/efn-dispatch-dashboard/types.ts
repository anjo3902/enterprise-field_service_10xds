/**
 * dispatch/efn-dispatch-dashboard/types.ts
 */

export interface DispatchDashboardResult {
  org_id:       string;
  period:       { start: string; end: string };
  summary: {
    total_dispatches:       number;
    completed_dispatches:   number;
    cancelled_dispatches:   number;
    overdue_dispatches:     number;
    conflict_count:         number;
    on_time_arrival_pct:    number;
    avg_response_time_mins: number;
    avg_travel_time_mins:   number;
  };
  technician_utilization: {
    avg_utilization_pct:    number;
    overloaded_count:       number;
    underutilized_count:    number;
  };
  status_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
}
