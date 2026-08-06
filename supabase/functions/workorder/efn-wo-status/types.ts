/**
 * workorder/efn-wo-status/types.ts
 */

export interface WoStatusResult {
  work_order_id:  string;
  previous_status: string;
  new_status:      string;
  transitioned_at: string;
}
