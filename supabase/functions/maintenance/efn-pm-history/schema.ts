/**
 * maintenance/efn-pm-history/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const PmHistorySchema = z.object({
  asset_id: uuidSchema,
  limit:    z.number().int().min(1).max(200).default(50),
  offset:   z.number().int().min(0).default(0),
});

export type PmHistoryInput = z.infer<typeof PmHistorySchema>;
