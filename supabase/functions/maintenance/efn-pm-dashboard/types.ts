/**
 * maintenance/efn-pm-dashboard/types.ts
 */

export interface PmDashboardResult {
  org_id: string;
  upcoming_pms: number;
  overdue_pms:  number;
  expiring_amcs: number;
  expiring_warranties: number;
  maintenance_completion_rate: number;
  asset_maintenance_score: number;
}
