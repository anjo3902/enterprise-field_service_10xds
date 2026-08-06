/**
 * asset/efn-asset-update/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString, dateOnlySchema } from "../../shared/validation/common-validators.ts";

export const UpdateAssetSchema = z.object({
  asset_id_pk:        uuidSchema,
  asset_name:         nonEmptyString.max(200).optional(),
  category:           nonEmptyString.max(100).optional(),
  vendor_id:          uuidSchema.optional(),
  site_id:            uuidSchema.optional(),
  location:           z.string().max(200).optional(),
  installation_date:  dateOnlySchema.optional(),
  warranty_expiry:    dateOnlySchema.optional(),
  amc_expiry:         dateOnlySchema.optional(),
  purchase_date:      dateOnlySchema.optional(),
  status:             z.enum(["Active", "Maintenance", "Inactive", "Decommissioned"]).optional(),
  notes:              z.string().max(1000).optional(),
  metadata:           z.record(z.unknown()).optional(),
}).refine(
  (d) => Object.keys(d).filter((k) => k !== "asset_id_pk").some((k) => d[k as keyof typeof d] !== undefined),
  { message: "At least one field to update must be provided" },
);

export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;
