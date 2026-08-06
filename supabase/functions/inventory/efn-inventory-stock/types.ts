/**
 * inventory/efn-inventory-stock/types.ts
 */

export interface StockResult {
  warehouse_id:       string;
  inventory_item_id:  string;
  current_quantity:   number;
  reserved_quantity:  number;
  available_quantity: number;
  average_cost:       number;
  stock_value:        number;
  status:             string;
}
