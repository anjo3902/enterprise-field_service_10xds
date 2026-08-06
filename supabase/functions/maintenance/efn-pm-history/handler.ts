/**
 * maintenance/efn-pm-history/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles retrieval of denormalized maintenance history for an asset.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { PmHistoryResult, PmHistoryItem } from "./types.ts";
import type { PmHistoryInput } from "./schema.ts";

const FUNCTION_NAME = "efn-pm-history";

export async function getPmHistory(
  body:          PmHistoryInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<PmHistoryResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  const { data: asset } = await db.from("assets").select("org_id").eq("id", body.asset_id).maybeSingle();
  if (!asset) throw new NotFoundError("Asset", correlationId);

  // Read access check: org user, or platform admin
  // For vendor/tech, RLS policy on the table itself handles row level filtering, 
  // but we can also block it early if we want.
  if (!claims.is_platform_admin && claims.org_id && asset["org_id"] !== claims.org_id) {
    throw new ForbiddenError("Permission denied", correlationId);
  }

  const { data, count, error } = await db.from("maintenance_history")
    .select("*", { count: "exact" })
    .eq("asset_id", body.asset_id)
    .order("completed_at", { ascending: false })
    .range(body.offset!, body.offset! + body.limit! - 1);

  if (error) throw new Error(error.message);

  const items: PmHistoryItem[] = (data ?? []).map((row: any) => ({
    id:               row.id,
    maintenance_type: row.maintenance_type,
    completed_by_id:  row.completed_by_id,
    completed_at:     row.completed_at,
    total_cost:       row.total_cost,
    remarks:          row.remarks,
    source: {
      ticket_id:       row.ticket_id ?? undefined,
      work_order_id:   row.work_order_id ?? undefined,
      pm_schedule_id:  row.pm_schedule_id ?? undefined,
      amc_contract_id: row.amc_contract_id ?? undefined,
      warranty_id:     row.warranty_id ?? undefined,
    }
  }));

  log.info({ correlationId, asset_id: body.asset_id, count }, "Maintenance history retrieved");

  return {
    asset_id: body.asset_id,
    data: items,
    total: count ?? 0,
  };
}
