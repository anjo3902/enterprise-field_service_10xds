/**
 * ai/efn-ai-diagnosis/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const AiDiagnosisSchema = z.object({
  action:    z.literal("diagnose"),
  ticket_id: uuidSchema,
  force_hitl_test: z.boolean().optional(), // Test flag
});

export type AiDiagnosisInput = z.infer<typeof AiDiagnosisSchema>;
