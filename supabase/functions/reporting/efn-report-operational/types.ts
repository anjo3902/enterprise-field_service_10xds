/**
 * reporting/efn-report-operational/types.ts
 */

export interface OperationalReportResult {
  org_id: string;
  reporting_period: string;
  data: any[]; // Returning aggregated SLA/Platform metrics
  total: number;
}
