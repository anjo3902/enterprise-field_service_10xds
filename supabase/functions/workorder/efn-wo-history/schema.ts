/**
 * workorder/efn-wo-history/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const WoHistorySchema = z.object({
  work_order_id: uuidSchema,
  include:       z.array(z.enum(["tasks", "labor", "parts", "checklist", "activity"]))
                   .default(["tasks", "labor", "parts", "checklist", "activity"]),
});

export type WoHistoryInput = z.infer<typeof WoHistorySchema>;
