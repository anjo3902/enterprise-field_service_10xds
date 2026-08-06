/**
 * dispatch/efn-dispatch-workload/types.ts
 */

export interface WorkloadResult {
  scope:          "technician" | "vendor" | "org";
  org_id?:        string;
  vendor_id?:     string;
  technician_id?: string;
  period:         { start: string; end: string };
  technicians:    TechWorkloadEntry[];
  summary: {
    total_hours_scheduled: number;
    avg_utilization_pct:   number;
    overloaded_count:      number;
    underutilized_count:   number;
    balanced_count:        number;
  };
  recommendations: string[];
}

export interface TechWorkloadEntry {
  technician_id:        string;
  total_hours_scheduled: number;
  active_dispatches:    number;
  utilization_pct:      number;
  status:               "overloaded" | "balanced" | "underutilized";
}
