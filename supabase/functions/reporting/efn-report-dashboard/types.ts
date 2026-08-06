/**
 * reporting/efn-report-dashboard/types.ts
 */

export interface DashboardResult {
  org_id: string;
  vendor_id?: string;
  dashboard_type: string;
  reporting_date: string;
  summary_data: any;
  widget_data: any;
}
