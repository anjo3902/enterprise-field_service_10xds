/**
 * reporting/efn-report-technician/types.ts
 */

export interface TechnicianReportResult {
  org_id: string;
  vendor_id?: string;
  reporting_period: string;
  data: any[];
  total: number;
}
