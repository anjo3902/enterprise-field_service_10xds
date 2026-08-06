/**
 * reporting/efn-report-vendor/types.ts
 */

export interface VendorReportResult {
  org_id: string;
  vendor_id?: string;
  reporting_period: string;
  data: any[];
  total: number;
}
