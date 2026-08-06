/**
 * reporting/efn-report-export/types.ts
 */

export interface ExportResult {
  action: string;
  report_type: string;
  export_format: string;
  status: string;
  job_id: string;
  message: string;
}
