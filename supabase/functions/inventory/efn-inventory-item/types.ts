/**
 * inventory/efn-inventory-item/types.ts
 */

export type InventoryItemAction = "create" | "update" | "deactivate";

export interface InventoryItemResult {
  action:        InventoryItemAction;
  item_id:       string;
  item_code:     string;
  name:          string;
  category:      string;
  unit:          string;
  minimum_stock: number;
  status:        string;
}
