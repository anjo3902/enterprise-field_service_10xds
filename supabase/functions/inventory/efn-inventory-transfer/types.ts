/**
 * inventory/efn-inventory-transfer/types.ts
 */

export interface TransferResult {
  transfer_id:       string;
  source_id:         string;
  destination_id:    string;
  transfer_type:     "warehouse_to_warehouse" | "warehouse_to_technician" | "technician_to_warehouse";
  inventory_item_id: string;
  quantity:          number;
}
