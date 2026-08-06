/**
 * inventory/efn-inventory-search/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const InventorySearchSchema = z.object({
  query:        z.string().max(255).optional(), // Searches name, item_code, barcode, qr_code
  warehouse_id: uuidSchema.optional(),
  category:     z.string().max(100).optional(),
  supplier_id:  uuidSchema.optional(), // Maps to manufacturer/vendor later if needed
  in_stock:     z.boolean().optional(),
  sort_by:      z.enum(["name", "current_quantity", "item_code"]).default("name"),
  sort_dir:     z.enum(["asc", "desc"]).default("asc"),
  limit:        z.number().int().min(1).max(200).default(50),
  offset:       z.number().int().min(0).default(0),
});

export type InventorySearchInput = z.infer<typeof InventorySearchSchema>;
