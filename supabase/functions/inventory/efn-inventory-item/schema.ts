/**
 * inventory/efn-inventory-item/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const CreateItemSchema = z.object({
  action:        z.literal("create"),
  item_code:     nonEmptyString.max(50),
  name:          nonEmptyString.max(255),
  description:   z.string().max(1000).optional(),
  category:      nonEmptyString.max(100),
  manufacturer:  z.string().max(255).optional(),
  part_number:   z.string().max(255).optional(),
  unit:          z.string().max(50).default("pcs"),
  minimum_stock: z.number().min(0).default(0),
  maximum_stock: z.number().min(0).optional(),
  reorder_level: z.number().min(0).optional(),
  barcode:       z.string().max(255).optional(),
  qr_code:       z.string().max(255).optional(),
}).refine(
  (d) => !d.maximum_stock || d.maximum_stock >= d.minimum_stock,
  { message: "maximum_stock must be >= minimum_stock" }
).refine(
  (d) => !d.reorder_level || d.reorder_level >= d.minimum_stock,
  { message: "reorder_level must be >= minimum_stock" }
);

const UpdateItemSchema = z.object({
  action:        z.literal("update"),
  item_id:       uuidSchema,
  name:          nonEmptyString.max(255).optional(),
  description:   z.string().max(1000).optional(),
  category:      nonEmptyString.max(100).optional(),
  manufacturer:  z.string().max(255).optional(),
  part_number:   z.string().max(255).optional(),
  unit:          z.string().max(50).optional(),
  minimum_stock: z.number().min(0).optional(),
  maximum_stock: z.number().min(0).optional(),
  reorder_level: z.number().min(0).optional(),
  barcode:       z.string().max(255).optional(),
  qr_code:       z.string().max(255).optional(),
});

const DeactivateItemSchema = z.object({
  action:  z.literal("deactivate"),
  item_id: uuidSchema,
});

export const InventoryItemSchema = z.discriminatedUnion("action", [
  CreateItemSchema,
  UpdateItemSchema,
  DeactivateItemSchema,
]);

export type InventoryItemInput = z.infer<typeof InventoryItemSchema>;
