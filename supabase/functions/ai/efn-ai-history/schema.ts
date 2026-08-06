/**
 * ai/efn-ai-history/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const AiHistorySchema = z.object({
  org_id:    uuidSchema.optional(),
  ticket_id: uuidSchema.optional(),
  asset_id:  uuidSchema.optional(),
  limit:     z.number().int().min(1).max(100).default(50),
  offset:    z.number().int().min(0).default(0),
});

export type AiHistoryInput = z.infer<typeof AiHistorySchema>;
