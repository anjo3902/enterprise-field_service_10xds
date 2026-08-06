/**
 * inventory/efn-inventory-transfer/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const InventoryTransferSchema = z.object({
  source_id:         uuidSchema,
  destination_id:    uuidSchema,
  transfer_type:     z.enum(["warehouse_to_warehouse", "warehouse_to_technician", "technician_to_warehouse"]),
  inventory_item_id: uuidSchema,
  quantity:          z.number().min(1),
  remarks:           z.string().max(1000).optional(),
});

export type InventoryTransferInput = z.infer<typeof InventoryTransferSchema>;
