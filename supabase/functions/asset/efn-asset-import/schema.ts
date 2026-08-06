/**
 * asset/efn-asset-import/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString, dateOnlySchema } from "../../shared/validation/common-validators.ts";

const ImportRecordSchema = z.object({
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
});

export const AssetImportSchema = z.object({
  org_id: uuidSchema,
  assets: z.array(ImportRecordSchema).min(1).max(500), // Max 500 per batch
});

export type AssetImportInput = z.infer<typeof AssetImportSchema>;
