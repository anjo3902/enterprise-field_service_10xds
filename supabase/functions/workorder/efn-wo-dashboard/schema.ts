/**
 * workorder/efn-wo-dashboard/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const WoDashboardSchema = z.object({
  org_id: uuidSchema.optional(),
});

export type WoDashboardInput = z.infer<typeof WoDashboardSchema>;
