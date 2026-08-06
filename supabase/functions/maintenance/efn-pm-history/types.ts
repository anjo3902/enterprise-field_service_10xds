/**
 * maintenance/efn-pm-history/types.ts
 */

export interface PmHistoryResult {
  asset_id: string;
  data:     PmHistoryItem[];
  total:    number;
}

export interface PmHistoryItem {
  id:               string;
  maintenance_type: string;
  completed_by_id:  string | null;
  completed_at:     string;
  total_cost:       number;
  remarks:          string | null;
  source: {
    ticket_id?:       string;
    work_order_id?:   string;
    pm_schedule_id?:  string;
    amc_contract_id?: string;
    warranty_id?:     string;
  };
}
