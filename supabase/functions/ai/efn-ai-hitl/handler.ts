/**
 * ai/efn-ai-hitl/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles Human-in-the-Loop review decisions.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { HitlResult } from "./types.ts";
import type { HitlInput } from "./schema.ts";

const FUNCTION_NAME = "efn-ai-hitl";

export async function handleHitlReview(
  body:          HitlInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<HitlResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // Find HITL queue item and its context
  const { data: queueItem } = await db.from("hitl_queue")
    .select("id, status, ticket_id, tickets(org_id)")
    .eq("id", body.queue_id)
    .maybeSingle();

  if (!queueItem) throw new NotFoundError("HITL Queue Item", correlationId);
  if (queueItem.status !== "pending" && queueItem.status !== "in_review") {
    throw new Error(`Queue item is already ${queueItem.status}`);
  }

  const orgId = queueItem.tickets?.org_id;

  if (!claims.is_platform_admin && orgId !== claims.org_id) {
    throw new ForbiddenError("Permission denied", correlationId);
  }

  // Update Queue Item
  await db.from("hitl_queue").update({
    decision: body.decision,
    remarks: body.remarks,
    status: "resolved",
    assigned_reviewer_id: claims.sub,
    reviewed_at: now,
    updated_at: now,
  }).eq("id", body.queue_id);

  // Audit log the human intervention
  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: orgId,
    entity_type: "hitl_queue", entity_id: body.queue_id, action: "REVIEW_COMPLETED",
    new_value: { decision: body.decision, remarks: body.remarks },
    timestamp: now,
  });

  await publishEvent({ event_name: "ai.review.completed" as never, payload: { queue_id: body.queue_id, decision: body.decision }, org_id: orgId, correlation_id: correlationId, source_function: FUNCTION_NAME });

  if (body.decision === "accepted" || body.decision === "modified") {
    // Fire event to resume automation downstream
    await publishEvent({ event_name: "ai.workflow.resumed" as never, payload: { queue_id: body.queue_id, ticket_id: queueItem.ticket_id }, org_id: orgId, correlation_id: correlationId, source_function: FUNCTION_NAME });
  }

  log.info({ correlationId, queue_id: body.queue_id, decision: body.decision }, "HITL decision recorded");

  return {
    action: "review_decision",
    queue_id: body.queue_id,
    decision: body.decision,
    status: "resolved"
  };
}
