/**
 * inventory/efn-inventory-movement/types.ts
 */

export interface StockMovementResult {
  movement_id:       string;
  warehouse_id:      string;
  inventory_item_id: string;
  movement_type:     string;
  quantity:          number;
  new_stock_quantity: number;
}
