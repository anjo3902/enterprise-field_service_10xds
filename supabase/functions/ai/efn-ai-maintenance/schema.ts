/**
 * ai/efn-ai-maintenance/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const AiMaintenanceSchema = z.object({
  action:          z.literal("predict_maintenance"),
  asset_id:        uuidSchema,
  force_hitl_test: z.boolean().optional(),
});

export type AiMaintenanceInput = z.infer<typeof AiMaintenanceSchema>;
