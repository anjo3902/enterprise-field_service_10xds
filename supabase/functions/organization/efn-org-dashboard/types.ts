/**
 * organization/efn-org-dashboard/types.ts
 */

export interface DashboardResult {
  org_id:         string;
  reporting_date: string;
  summary: {
    ticket_count: number;
    asset_count:  number;
    sla_rate:     number | null;
  };
  snapshot: Record<string, unknown>; // Precomputed widget data
}
