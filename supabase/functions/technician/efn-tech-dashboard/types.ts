/**
 * technician/efn-tech-dashboard/types.ts
 */

export interface TechDashboardInput {
  technician_id: string;
}

export interface TechDashboardResult {
  technician_id: string;
  availability: {
    status:             string;
    reason:             string | null;
    current_work_order: string | null;
  };
  metrics: {
    jobs_completed:       number;
    avg_resolution_hours: number | null;
    customer_rating:      number | null;
    sla_compliance:       number | null;
    first_time_fix_rate:  number | null;
  };
  today_workload: {
    assigned_jobs:  number;
    completed_jobs: number;
    pending_jobs:   number;
    travel_hours:   number;
    work_hours:     number;
  };
}
