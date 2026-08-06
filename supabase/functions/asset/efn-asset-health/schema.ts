/**
 * asset/efn-asset-health/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const GetAssetHealthSchema = z.object({
  asset_id_pk: uuidSchema,
});

export type GetAssetHealthInput = z.infer<typeof GetAssetHealthSchema>;
