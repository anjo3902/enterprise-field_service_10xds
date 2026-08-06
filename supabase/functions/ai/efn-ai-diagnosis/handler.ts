/**
 * ai/efn-ai-diagnosis/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles AI-powered ticket diagnosis.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { AiDiagnosisResult } from "./types.ts";
import type { AiDiagnosisInput } from "./schema.ts";
import { invokeAiModel } from "../../shared/ai/provider.ts";

const FUNCTION_NAME = "efn-ai-diagnosis";
const HITL_CONFIDENCE_THRESHOLD = 0.80; // Below this requires human review

export async function handleAiDiagnosis(
  body:          AiDiagnosisInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<AiDiagnosisResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  const { data: ticket } = await db.from("tickets").select("id, org_id, asset_id, description").eq("id", body.ticket_id).maybeSingle();
  if (!ticket) throw new NotFoundError("Ticket", correlationId);

  // Check cache first (simplified for demo)
  if (ticket.asset_id) {
    const { data: cache } = await db.from("ai_diagnosis_cache")
      .select("*")
      .eq("asset_id", ticket.asset_id)
      .eq("ticket_id", ticket.id)
      .gt("expires_at", now)
      .maybeSingle();

    if (cache) {
      log.info({ correlationId, ticket_id: body.ticket_id }, "Diagnosis cache hit");
      return {
        action: "diagnose", ticket_id: body.ticket_id, ai_request_id: "cached",
        diagnosis: cache.diagnosis, severity: cache.severity, recommended_action: cache.recommended_action,
        confidence: cache.confidence_score, hitl_required: false, status: "completed"
      };
    }
  }

  const prompt = `Provide diagnosis for ticket description: ${ticket.description}. ${body.force_hitl_test ? "FORCE_HITL" : ""}`;
  
  // Call AI Provider
  const aiResult = await invokeAiModel({ prompt, model: "orchestrator-default" });
  
  const aiReqId = generateUuid();
  await db.from("ai_requests").insert({
    id: aiReqId, correlation_id: correlationId, ticket_id: body.ticket_id, asset_id: ticket.asset_id,
    org_id: ticket.org_id, requested_by: claims.sub, input_payload: { prompt }, output_payload: aiResult.output,
    started_at: now, completed_at: nowUtc(), latency_ms: aiResult.latency_ms, input_tokens: aiResult.input_tokens,
    output_tokens: aiResult.output_tokens, confidence_score: aiResult.confidence, status: "completed"
  });

  let hitlRequired = aiResult.confidence < HITL_CONFIDENCE_THRESHOLD;

  if (hitlRequired) {
    await db.from("hitl_queue").insert({
      id: generateUuid(), ticket_id: body.ticket_id, ai_request_id: aiReqId, review_type: "low_confidence",
      confidence_score: aiResult.confidence, reason: "Diagnosis confidence below threshold", status: "pending", created_at: nowUtc()
    });
    await publishEvent({ event_name: "ai.review.requested" as never, payload: { ticket_id: body.ticket_id, request_id: aiReqId }, org_id: ticket.org_id, correlation_id: correlationId, source_function: FUNCTION_NAME });
  } else {
    // Cache result if high confidence
    if (ticket.asset_id) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24hr cache
      await db.from("ai_diagnosis_cache").insert({
        id: generateUuid(), asset_id: ticket.asset_id, ticket_id: ticket.id,
        diagnosis: aiResult.output.diagnosis, severity: aiResult.output.severity, recommended_action: aiResult.output.recommended_action,
        confidence_score: aiResult.confidence, expires_at: expiresAt, created_at: nowUtc()
      });
    }
    await publishEvent({ event_name: "ai.diagnosis.generated" as never, payload: { ticket_id: body.ticket_id, request_id: aiReqId }, org_id: ticket.org_id, correlation_id: correlationId, source_function: FUNCTION_NAME });
  }

  log.info({ correlationId, ticket_id: body.ticket_id, confidence: aiResult.confidence, hitlRequired }, "AI Diagnosis generated");

  return {
    action: "diagnose",
    ticket_id: body.ticket_id,
    ai_request_id: aiReqId,
    diagnosis: aiResult.output.diagnosis ?? "Unknown",
    severity: aiResult.output.severity ?? "Unknown",
    recommended_action: aiResult.output.recommended_action ?? "Unknown",
    confidence: aiResult.confidence,
    hitl_required: hitlRequired,
    status: hitlRequired ? "pending_review" : "completed"
  };
}
