/**
 * ai/efn-ai-history/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles retrieval of AI audit history.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { AiHistoryResult, AiHistoryItem } from "./types.ts";
import type { AiHistoryInput } from "./schema.ts";

const FUNCTION_NAME = "efn-ai-history";

export async function getAiHistory(
  body:          AiHistoryInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<AiHistoryResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  const orgId = claims.is_platform_admin ? (body.org_id ?? claims.org_id) : claims.org_id;
  if (!orgId) throw new ForbiddenError("org_id is required", correlationId);

  let query = db.from("ai_requests")
    .select("id, ticket_id, asset_id, requested_by, input_payload, latency_ms, confidence_score, status, started_at, completed_at", { count: "exact" })
    .eq("org_id", orgId)
    .order("started_at", { ascending: false })
    .range(body.offset!, body.offset! + body.limit! - 1);

  if (body.ticket_id) query = query.eq("ticket_id", body.ticket_id);
  if (body.asset_id) query = query.eq("asset_id", body.asset_id);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const items: AiHistoryItem[] = (data ?? []).map((row: any) => ({
    id:               row.id,
    ticket_id:        row.ticket_id,
    asset_id:         row.asset_id,
    requested_by:     row.requested_by,
    prompt_snippet:   (row.input_payload?.prompt ?? "").substring(0, 50) + "...",
    latency_ms:       row.latency_ms,
    confidence_score: row.confidence_score,
    status:           row.status,
    started_at:       row.started_at,
    completed_at:     row.completed_at,
  }));

  log.info({ correlationId, orgId, count }, "AI history retrieved");

  return {
    org_id: orgId,
    data: items,
    total: count ?? 0,
  };
}
