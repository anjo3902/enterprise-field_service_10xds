/**
 * inventory/efn-inventory-reservation/types.ts
 */

export interface ReservationResult {
  action:            "reserve" | "release" | "cancel" | "consume";
  reservation_id:    string;
  work_order_id:     string;
  inventory_item_id: string;
  warehouse_id:      string;
  quantity:          number;
  status:            string;
}
