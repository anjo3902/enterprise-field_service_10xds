/**
 * inventory/efn-inventory-reservation/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const InventoryReservationSchema = z.object({
  action:            z.enum(["reserve", "release", "cancel", "consume"]),
  work_order_id:     uuidSchema.optional(),
  inventory_item_id: uuidSchema.optional(),
  warehouse_id:      uuidSchema.optional(),
  quantity:          z.number().min(1).optional(),
  reservation_id:    uuidSchema.optional(),
  consumption_cost:  z.number().min(0).optional(),
}).refine(
  (d) => {
    if (d.action === "reserve") return d.work_order_id && d.inventory_item_id && d.warehouse_id && d.quantity;
    return !!d.reservation_id;
  },
  { message: "reserve action requires work_order_id, inventory_item_id, warehouse_id, quantity. Other actions require reservation_id." }
);

export type InventoryReservationInput = z.infer<typeof InventoryReservationSchema>;
