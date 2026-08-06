/**
 * reporting/efn-report-export/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const ExportSchema = z.object({
  action:        z.literal("export_report"),
  org_id:        uuidSchema.optional(),
  report_type:   z.enum(["operational", "technician", "vendor", "asset", "inventory", "ai", "financial"]),
  export_format: z.enum(["csv", "excel", "pdf"]),
  filters:       z.record(z.any()).optional(), // e.g. start_date, end_date
});

export type ExportInput = z.infer<typeof ExportSchema>;
