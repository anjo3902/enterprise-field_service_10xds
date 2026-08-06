/**
 * vendor/efn-vendor-dashboard/types.ts
 */

export interface VendorDashboardResult {
  vendor_id:       string;
  reporting_date:  string;
  live_stats: {
    technician_count:  number;
    rating:            number | null;
    sla_compliance:    number | null;
    sla_target:        number;
    active_contracts:  number;
  };
  snapshot: Record<string, unknown>;
}
