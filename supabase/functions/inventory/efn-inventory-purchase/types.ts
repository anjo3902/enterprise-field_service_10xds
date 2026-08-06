/**
 * inventory/efn-inventory-purchase/types.ts
 */

export interface PurchaseResult {
  action:              "create" | "update_status";
  purchase_request_id: string;
  request_number:      string;
  status:              string;
}
