/**
 * notifications/efn-notification-dashboard/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles retrieval of notification analytics.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { DashboardResult } from "./types.ts";
import type { DashboardInput } from "./schema.ts";

const FUNCTION_NAME = "efn-notification-dashboard";

export async function getDashboard(
  body:          DashboardInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<DashboardResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  const orgId = claims.is_platform_admin ? (body.org_id ?? claims.org_id) : claims.org_id;
  if (!orgId) throw new ForbiddenError("org_id is required", correlationId);

  const { count: totalSent } = await db.from("notifications").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  const { count: totalFailed } = await db.from("notifications").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("delivery_status", "failed");
  const { count: totalRead } = await db.from("notifications").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_read", true);

  const sent = totalSent ?? 0;
  const read = totalRead ?? 0;
  const openRate = sent > 0 ? (read / sent) * 100 : 100;

  log.info({ correlationId, orgId }, "Notification Dashboard metrics aggregated");

  return {
    org_id: orgId,
    total_delivered: sent,
    total_failed: totalFailed ?? 0,
    open_rate: Math.round(openRate * 10) / 10,
  };
}
