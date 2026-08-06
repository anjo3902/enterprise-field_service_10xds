/**
 * inventory/efn-inventory-dashboard/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const InventoryDashboardSchema = z.object({
  org_id:       uuidSchema.optional(),
  vendor_id:    uuidSchema.optional(),
});

export type InventoryDashboardInput = z.infer<typeof InventoryDashboardSchema>;
