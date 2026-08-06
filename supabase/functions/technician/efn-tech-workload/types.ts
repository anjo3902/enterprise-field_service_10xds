/**
 * technician/efn-tech-workload/types.ts
 */

export interface GetWorkloadQuery {
  technician_id: string;
  from_date?:    string;
  to_date?:      string;
}

export interface WorkloadDay {
  workload_date:     string;
  assigned_jobs:     number;
  completed_jobs:    number;
  pending_jobs:      number;
  travel_hours:      number;
  work_hours:        number;
  overtime_hours:    number;
  capacity_score:    number | null;
  utilization_score: number | null;
}

export interface GetWorkloadResult {
  technician_id: string;
  workload:      WorkloadDay[];
}
