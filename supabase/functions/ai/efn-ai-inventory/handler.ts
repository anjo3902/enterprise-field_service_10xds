/**
 * ai/efn-ai-inventory/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles AI-powered inventory recommendations for a ticket.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { AiInventoryResult } from "./types.ts";
import type { AiInventoryInput } from "./schema.ts";
import { invokeAiModel } from "../../shared/ai/provider.ts";

const FUNCTION_NAME = "efn-ai-inventory";
const HITL_CONFIDENCE_THRESHOLD = 0.85;

export async function handleAiInventory(
  body:          AiInventoryInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<AiInventoryResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  const { data: ticket } = await db.from("tickets").select("id, org_id, asset_id, description").eq("id", body.ticket_id).maybeSingle();
  if (!ticket) throw new NotFoundError("Ticket", correlationId);

  const prompt = `Recommend inventory parts for ticket: ${ticket.description}. ${body.force_hitl_test ? "FORCE_HITL" : ""}`;
  
  const aiResult = await invokeAiModel({ prompt, model: "orchestrator-default" });
  
  const aiReqId = generateUuid();
  await db.from("ai_requests").insert({
    id: aiReqId, correlation_id: correlationId, ticket_id: body.ticket_id, asset_id: ticket.asset_id,
    org_id: ticket.org_id, requested_by: claims.sub, input_payload: { prompt }, output_payload: aiResult.output,
    started_at: now, completed_at: nowUtc(), latency_ms: aiResult.latency_ms, input_tokens: aiResult.input_tokens,
    output_tokens: aiResult.output_tokens, confidence_score: aiResult.confidence, status: "completed"
  });

  const hitlRequired = aiResult.confidence < HITL_CONFIDENCE_THRESHOLD;

  if (hitlRequired) {
    await db.from("hitl_queue").insert({
      id: generateUuid(), ticket_id: body.ticket_id, ai_request_id: aiReqId, review_type: "low_confidence",
      confidence_score: aiResult.confidence, reason: "Inventory recommendation confidence below threshold", status: "pending", created_at: nowUtc()
    });
    await publishEvent({ event_name: "ai.review.requested" as never, payload: { ticket_id: body.ticket_id, request_id: aiReqId }, org_id: ticket.org_id, correlation_id: correlationId, source_function: FUNCTION_NAME });
  } else {
    // Write recommendation
    await db.from("ai_recommendations").insert({
      id: generateUuid(), ticket_id: body.ticket_id, ai_request_id: aiReqId,
      recommendation_type: "inventory", recommendation_score: aiResult.confidence, reasoning: JSON.stringify(aiResult.output.required_parts),
      created_at: nowUtc()
    });
    await publishEvent({ event_name: "ai.inventory.recommended" as never, payload: { ticket_id: body.ticket_id, request_id: aiReqId }, org_id: ticket.org_id, correlation_id: correlationId, source_function: FUNCTION_NAME });
  }

  log.info({ correlationId, ticket_id: body.ticket_id, hitlRequired }, "AI Inventory recommendation generated");

  return {
    action: "inventory_recommendation",
    ticket_id: body.ticket_id,
    ai_request_id: aiReqId,
    required_parts: aiResult.output.required_parts ?? [],
    alternatives: aiResult.output.alternatives ?? [],
    availability_status: aiResult.output.availability_status ?? "Unknown",
    confidence: aiResult.confidence,
    hitl_required: hitlRequired,
    status: hitlRequired ? "pending_review" : "completed"
  };
}
