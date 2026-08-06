/**
 * workorder/efn-wo-update/types.ts
 */

export interface UpdateWorkOrderResult {
  work_order_id: string;
  updated_at:    string;
  changes:       string[];
}
