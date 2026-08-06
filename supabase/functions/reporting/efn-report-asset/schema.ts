/**
 * reporting/efn-report-asset/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const AssetReportSchema = z.object({
  org_id:       uuidSchema.optional(),
  start_date:   z.string().datetime().optional(),
  end_date:     z.string().datetime().optional(),
  limit:        z.number().int().min(1).max(500).default(50),
  offset:       z.number().int().min(0).default(0),
});

export type AssetReportInput = z.infer<typeof AssetReportSchema>;
