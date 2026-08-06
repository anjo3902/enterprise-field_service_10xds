/**
 * inventory/efn-inventory-dashboard/types.ts
 */

export interface InventoryDashboardResult {
  org_id:       string;
  summary: {
    total_items:       number;
    total_stock_value: number;
    low_stock_items:   number;
    out_of_stock_items: number;
  };
  warehouse_metrics: {
    warehouse_id:   string;
    warehouse_name: string;
    total_value:    number;
    items_count:    number;
  }[];
  recent_movements: {
    receipts:    number;
    issues:      number;
    transfers:   number;
    consumptions: number;
  };
}
