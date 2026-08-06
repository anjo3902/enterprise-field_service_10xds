/**
 * vendor/efn-vendor-performance/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, dateOnlySchema } from "../../shared/validation/common-validators.ts";

export const PerformanceQuerySchema = z.object({
  vendor_id:  uuidSchema,
  from_date:  dateOnlySchema.optional(),
  to_date:    dateOnlySchema.optional(),
}).refine(
  (d) => !d.from_date || !d.to_date || new Date(d.to_date) >= new Date(d.from_date),
  { message: "to_date must be >= from_date", path: ["to_date"] },
);

export type PerformanceQueryInput = z.infer<typeof PerformanceQuerySchema>;
