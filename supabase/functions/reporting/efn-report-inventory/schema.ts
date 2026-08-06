/**
 * reporting/efn-report-inventory/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const InventoryReportSchema = z.object({
  org_id:       uuidSchema.optional(),
  start_date:   z.string().datetime().optional(), // Used to filter movements
  end_date:     z.string().datetime().optional(),
  limit:        z.number().int().min(1).max(500).default(50),
  offset:       z.number().int().min(0).default(0),
});

export type InventoryReportInput = z.infer<typeof InventoryReportSchema>;
