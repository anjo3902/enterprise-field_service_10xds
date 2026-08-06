/**
 * reporting/efn-report-financial/types.ts
 */

export interface FinancialReportResult {
  org_id: string;
  vendor_id?: string;
  reporting_period: string;
  data: any[];
  total: number;
}
