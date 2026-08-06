/**
 * notifications/efn-notification-dashboard/types.ts
 */

export interface DashboardResult {
  org_id: string;
  total_delivered: number;
  total_failed: number;
  open_rate: number;
}
