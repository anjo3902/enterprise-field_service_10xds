/**
 * vendor/efn-vendor-performance/types.ts
 */

export interface PerformanceQuery {
  vendor_id:        string;
  from_date?:       string;
  to_date?:         string;
}

export interface PerformanceSummary {
  vendor_id:               string;
  current_rating:          number | null;
  current_sla_compliance:  number | null;
  current_sla_target:      number;
  periods:                 PerformancePeriod[];
}

export interface PerformancePeriod {
  reporting_period:        string;
  tickets_completed:       number;
  avg_response_time_mins:  number | null;
  avg_resolution_time_mins: number | null;
  sla_compliance_pct:      number | null;
  customer_rating:         number | null;
  performance_score:       number | null;
  revenue:                 number;
  cost:                    number;
}
