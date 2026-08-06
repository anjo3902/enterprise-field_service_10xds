/**
 * workorder/efn-wo-create/types.ts
 */

export interface CreateWorkOrderResult {
  work_order_id:     string;
  work_order_number: string;
  ticket_id:         string;
  org_id:            string;
  status:            string;
  created_at:        string;
}
