/**
 * ai/efn-ai-priority/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const AiPrioritySchema = z.object({
  action:    z.literal("prioritize"),
  ticket_id: uuidSchema,
  force_hitl_test: z.boolean().optional(),
});

export type AiPriorityInput = z.infer<typeof AiPrioritySchema>;
