/**
 * ai/tests/ai.test.ts
 */

import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";

Deno.test("efn-ai-diagnosis schema validation", async () => {
  const { AiDiagnosisSchema } = await import("../efn-ai-diagnosis/schema.ts");
  const payload = {
    action: "diagnose",
    ticket_id: generateUuid(),
    force_hitl_test: true,
  };

  const result = AiDiagnosisSchema.safeParse(payload);
  assertEquals(result.success, true);
});

Deno.test("efn-ai-priority schema validation", async () => {
  const { AiPrioritySchema } = await import("../efn-ai-priority/schema.ts");
  const payload = {
    action: "prioritize",
    ticket_id: "invalid-uuid", // should fail
  };

  const result = AiPrioritySchema.safeParse(payload);
  assertEquals(result.success, false);
});

Deno.test("efn-ai-dispatch schema validation", async () => {
  const { AiDispatchSchema } = await import("../efn-ai-dispatch/schema.ts");
  const payload = {
    action: "dispatch_recommendation",
    ticket_id: generateUuid(),
  };

  const result = AiDispatchSchema.safeParse(payload);
  assertEquals(result.success, true);
});

Deno.test("efn-ai-hitl schema validation", async () => {
  const { HitlSchema } = await import("../efn-ai-hitl/schema.ts");
  const payload = {
    action: "review_decision",
    queue_id: generateUuid(),
    decision: "accepted",
    remarks: "Looks good to me."
  };

  const result = HitlSchema.safeParse(payload);
  assertEquals(result.success, true);
});

Deno.test("Provider Stub verification", async () => {
  const { invokeAiModel } = await import("../../shared/ai/provider.ts");
  
  // High confidence path
  const normalResult = await invokeAiModel({ prompt: "diagnose the HVAC" });
  assertEquals(normalResult.confidence >= 0.75, true);
  
  // Forced low confidence path (HITL Trigger)
  const hitlResult = await invokeAiModel({ prompt: "diagnose the HVAC FORCE_HITL" });
  assertEquals(hitlResult.confidence, 0.45);
});
