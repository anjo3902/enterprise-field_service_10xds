/**
 * inventory/efn-inventory-purchase/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const PurchaseItemSchema = z.object({
  inventory_item_id: uuidSchema,
  quantity:          z.number().min(1),
  unit_cost:         z.number().min(0).optional(),
});

export const InventoryPurchaseSchema = z.object({
  action:              z.enum(["create", "update_status"]),
  purchase_request_id: uuidSchema.optional(),
  vendor_id:           uuidSchema.optional(),
  priority:            z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  expected_delivery:   z.string().date().optional(),
  remarks:             z.string().max(1000).optional(),
  items:               z.array(PurchaseItemSchema).min(1).optional(),
  approval_status:     z.enum(["draft", "submitted", "approved", "rejected", "fulfilled", "cancelled"]).optional(),
}).refine(
  (d) => {
    if (d.action === "create") return !!d.items;
    return !!d.purchase_request_id && !!d.approval_status;
  },
  { message: "create requires items; update_status requires purchase_request_id and approval_status" }
);

export type InventoryPurchaseInput = z.infer<typeof InventoryPurchaseSchema>;
