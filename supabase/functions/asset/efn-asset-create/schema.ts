/**
 * asset/efn-asset-create/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString, dateOnlySchema } from "../../shared/validation/common-validators.ts";

export const CreateAssetSchema = z.object({
  org_id:             uuidSchema,
  asset_name:         nonEmptyString.max(200),
  category:           nonEmptyString.max(100),
  vendor_id:          uuidSchema.optional(),
  site_id:            uuidSchema.optional(),
  location:           z.string().max(200).optional(),
  installation_date:  dateOnlySchema.optional(),
  warranty_expiry:    dateOnlySchema.optional(),
  amc_expiry:         dateOnlySchema.optional(),
  purchase_date:      dateOnlySchema.optional(),
  status:             z.enum(["Active", "Maintenance", "Inactive", "Decommissioned"]).default("Active"),
  notes:              z.string().max(1000).optional(),
  metadata:           z.record(z.unknown()).optional(),
});

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;
