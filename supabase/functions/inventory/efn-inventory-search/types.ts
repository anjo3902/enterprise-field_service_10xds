/**
 * inventory/efn-inventory-search/types.ts
 */

export interface InventorySearchResult {
  data:   InventorySearchItem[];
  total:  number;
  limit:  number;
  offset: number;
}

export interface InventorySearchItem {
  id:                 string;
  item_code:          string;
  name:               string;
  category:           string;
  barcode:            string | null;
  qr_code:            string | null;
  current_quantity:   number;
  available_quantity: number;
  warehouse_id:       string;
  warehouse_name:     string;
}
