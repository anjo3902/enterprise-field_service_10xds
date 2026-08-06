/**
 * ai/efn-ai-maintenance/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles AI predictions for asset maintenance.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { AiMaintenanceResult } from "./types.ts";
import type { AiMaintenanceInput } from "./schema.ts";
import { invokeAiModel } from "../../shared/ai/provider.ts";

const FUNCTION_NAME = "efn-ai-maintenance";
const HITL_CONFIDENCE_THRESHOLD = 0.80;

export async function handleAiMaintenance(
  body:          AiMaintenanceInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<AiMaintenanceResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  const { data: asset } = await db.from("assets").select("id, org_id, name").eq("id", body.asset_id).maybeSingle();
  if (!asset) throw new NotFoundError("Asset", correlationId);

  const prompt = `Predict maintenance needs for asset: ${asset.name}. ${body.force_hitl_test ? "FORCE_HITL" : ""}`;
  
  const aiResult = await invokeAiModel({ prompt, model: "orchestrator-default" });
  
  const aiReqId = generateUuid();
  await db.from("ai_requests").insert({
    id: aiReqId, correlation_id: correlationId, asset_id: body.asset_id,
    org_id: asset.org_id, requested_by: claims.sub, input_payload: { prompt }, output_payload: aiResult.output,
    started_at: now, completed_at: nowUtc(), latency_ms: aiResult.latency_ms, input_tokens: aiResult.input_tokens,
    output_tokens: aiResult.output_tokens, confidence_score: aiResult.confidence, status: "completed"
  });

  const hitlRequired = aiResult.confidence < HITL_CONFIDENCE_THRESHOLD;

  if (hitlRequired) {
    await db.from("hitl_queue").insert({
      id: generateUuid(), ai_request_id: aiReqId, review_type: "low_confidence",
      confidence_score: aiResult.confidence, reason: "Maintenance prediction confidence below threshold", status: "pending", created_at: nowUtc()
    });
    // Note: HITL queue normally requires a ticket ID, but we can queue based on request ID. 
    await publishEvent({ event_name: "ai.review.requested" as never, payload: { request_id: aiReqId }, org_id: asset.org_id, correlation_id: correlationId, source_function: FUNCTION_NAME });
  } else {
    // Write recommendation for PM planning to use later
    await db.from("ai_recommendations").insert({
      id: generateUuid(), ai_request_id: aiReqId,
      recommendation_type: "pm_schedule", recommendation_score: aiResult.confidence, reasoning: aiResult.output.recommended_preventive_action,
      created_at: nowUtc()
    });
    await publishEvent({ event_name: "ai.maintenance.predicted" as never, payload: { asset_id: body.asset_id, request_id: aiReqId }, org_id: asset.org_id, correlation_id: correlationId, source_function: FUNCTION_NAME });
  }

  log.info({ correlationId, asset_id: body.asset_id, hitlRequired }, "AI Maintenance prediction generated");

  return {
    action: "predict_maintenance",
    asset_id: body.asset_id,
    ai_request_id: aiReqId,
    predicted_failure_date: aiResult.output.predicted_failure_date ?? "Unknown",
    remaining_useful_life_days: aiResult.output.remaining_useful_life_days ?? 0,
    recommended_preventive_action: aiResult.output.recommended_preventive_action ?? "Unknown",
    confidence: aiResult.confidence,
    hitl_required: hitlRequired,
    status: hitlRequired ? "pending_review" : "completed"
  };
}
