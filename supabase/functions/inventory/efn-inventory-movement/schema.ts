/**
 * inventory/efn-inventory-movement/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const InventoryMovementSchema = z.object({
  warehouse_id:      uuidSchema,
  inventory_item_id: uuidSchema,
  movement_type:     z.enum(["receipt", "issue", "transfer", "adjustment", "return", "damage", "write_off"]),
  quantity:          z.number().refine(n => n !== 0, { message: "quantity cannot be zero" }),
  reference_type:    z.string().max(50).optional(),
  reference_id:      uuidSchema.optional(),
  remarks:           z.string().max(1000).optional(),
});

export type InventoryMovementInput = z.infer<typeof InventoryMovementSchema>;
