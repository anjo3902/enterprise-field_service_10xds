/**
 * ai/efn-ai-dashboard/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const AiDashboardSchema = z.object({
  org_id: uuidSchema.optional(),
});

export type AiDashboardInput = z.infer<typeof AiDashboardSchema>;
