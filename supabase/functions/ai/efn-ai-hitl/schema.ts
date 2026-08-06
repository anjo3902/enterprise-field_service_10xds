/**
 * ai/efn-ai-hitl/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const HitlSchema = z.object({
  action:   z.literal("review_decision"),
  queue_id: uuidSchema,
  decision: z.enum(["accepted", "rejected", "modified"]),
  remarks:  z.string().max(1000).optional(),
});

export type HitlInput = z.infer<typeof HitlSchema>;
