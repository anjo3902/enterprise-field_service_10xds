/**
 * vendor/efn-vendor-dashboard/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, dateOnlySchema } from "../../shared/validation/common-validators.ts";

export const VendorDashboardSchema = z.object({
  vendor_id:      uuidSchema,
  reporting_date: dateOnlySchema.optional(),
});

export type VendorDashboardInput = z.infer<typeof VendorDashboardSchema>;
