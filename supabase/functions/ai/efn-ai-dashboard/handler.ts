/**
 * ai/efn-ai-dashboard/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles retrieval of AI performance and automation metrics.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { AiDashboardResult } from "./types.ts";
import type { AiDashboardInput } from "./schema.ts";

const FUNCTION_NAME = "efn-ai-dashboard";

export async function getAiDashboard(
  body:          AiDashboardInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<AiDashboardResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  const orgId = claims.is_platform_admin ? (body.org_id ?? claims.org_id) : claims.org_id;
  if (!orgId) throw new ForbiddenError("org_id is required", correlationId);

  // Total AI requests
  const { count: totalRequests } = await db.from("ai_requests").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  
  // Avg confidence (mocked calculation via RPC in real-world, simplifying here)
  const { data: confData } = await db.from("ai_requests").select("confidence_score").eq("org_id", orgId).not("confidence_score", "is", null);
  const sumConf = (confData ?? []).reduce((acc, row) => acc + (row.confidence_score ?? 0), 0);
  const avgConf = confData && confData.length > 0 ? sumConf / confData.length : 0;

  // HITL Queue
  const { data: hitlData } = await db.from("hitl_queue").select("status, tickets!inner(org_id)").eq("tickets.org_id", orgId);
  const hitlTotal = hitlData?.length ?? 0;
  const hitlPending = (hitlData ?? []).filter(r => r.status === "pending" || r.status === "in_review").length;
  
  const automationRate = totalRequests && totalRequests > 0 ? ((totalRequests - hitlTotal) / totalRequests) * 100 : 100;
  const hitlInterventionRate = 100 - automationRate;

  // Recommendations accepted
  const { count: recTotal } = await db.from("ai_recommendations").select("id, tickets!inner(org_id)", { count: "exact", head: true }).eq("tickets.org_id", orgId);
  const { count: recAccepted } = await db.from("ai_recommendations").select("id, tickets!inner(org_id)", { count: "exact", head: true }).eq("tickets.org_id", orgId).eq("is_accepted", true);

  log.info({ correlationId, orgId }, "AI Dashboard metrics aggregated");

  return {
    org_id: orgId,
    total_requests: totalRequests ?? 0,
    average_confidence: Math.round(avgConf * 100) / 100,
    automation_rate: Math.round(automationRate * 10) / 10,
    hitl_intervention_rate: Math.round(hitlInterventionRate * 10) / 10,
    hitl_pending: hitlPending,
    recommendations_accepted: recAccepted ?? 0,
  };
}
