/**
 * ai/efn-ai-dispatch/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const AiDispatchSchema = z.object({
  action:    z.literal("dispatch_recommendation"),
  ticket_id: uuidSchema,
  force_hitl_test: z.boolean().optional(),
});

export type AiDispatchInput = z.infer<typeof AiDispatchSchema>;
