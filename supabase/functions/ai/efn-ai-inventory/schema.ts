/**
 * ai/efn-ai-inventory/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const AiInventorySchema = z.object({
  action:    z.literal("inventory_recommendation"),
  ticket_id: uuidSchema,
  force_hitl_test: z.boolean().optional(),
});

export type AiInventoryInput = z.infer<typeof AiInventorySchema>;
