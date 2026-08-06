/**
 * inventory/efn-inventory-stock/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const InventoryStockSchema = z.object({
  action:            z.enum(["get", "reconcile"]),
  warehouse_id:      uuidSchema,
  inventory_item_id: uuidSchema,
  // Only required for "reconcile" action
  actual_quantity:   z.number().min(0).optional(),
  reason:            z.string().max(500).optional(),
}).refine(
  (d) => d.action !== "reconcile" || (d.actual_quantity !== undefined && d.reason !== undefined),
  { message: "actual_quantity and reason are required for reconciliation" }
);

export type InventoryStockInput = z.infer<typeof InventoryStockSchema>;
