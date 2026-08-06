/**
 * asset/efn-asset-history/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const GetAssetHistorySchema = z.object({
  asset_id_pk: uuidSchema,
  limit:       z.number().int().min(1).max(100).default(50),
});

export type GetAssetHistoryInput = z.infer<typeof GetAssetHistorySchema>;
