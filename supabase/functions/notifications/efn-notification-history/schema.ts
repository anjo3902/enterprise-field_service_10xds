/**
 * notifications/efn-notification-history/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const HistorySchema = z.object({
  action:    z.literal("get_history"),
  limit:     z.number().int().min(1).max(200).default(50),
  offset:    z.number().int().min(0).default(0),
  recipient_id: uuidSchema.optional(), // If platform admin wants to filter
});

export type HistoryInput = z.infer<typeof HistorySchema>;
