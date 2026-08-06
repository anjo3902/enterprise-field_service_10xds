/**
 * maintenance/efn-pm-generator/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const PmGeneratorSchema = z.object({
  target_date: z.string().date().optional(), // Sweeps schedules due up to this date. Default: today
  org_id:      uuidSchema.optional(),        // Scope to specific org
});

export type PmGeneratorInput = z.infer<typeof PmGeneratorSchema>;
