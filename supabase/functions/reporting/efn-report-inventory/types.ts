/**
 * reporting/efn-report-inventory/types.ts
 */

export interface InventoryReportResult {
  org_id: string;
  reporting_period: string;
  data: any[];
  total: number;
}
