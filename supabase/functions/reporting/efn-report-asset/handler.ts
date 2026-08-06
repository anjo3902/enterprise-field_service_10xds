/**
 * reporting/efn-report-asset/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Retrieves asset health, failure frequency, and maintenance history metrics.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { AssetReportResult } from "./types.ts";
import type { AssetReportInput } from "./schema.ts";

const FUNCTION_NAME = "efn-report-asset";

export async function handleAssetReport(
  body:          AssetReportInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<AssetReportResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  const orgId = claims.is_platform_admin ? (body.org_id ?? claims.org_id) : claims.org_id;
  if (!orgId) throw new ForbiddenError("org_id is required", correlationId);

  let query = db.from("asset_analytics")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .order("reporting_period", { ascending: false })
    .range(body.offset!, body.offset! + body.limit! - 1);

  if (body.start_date) query = query.gte("reporting_period", body.start_date);
  if (body.end_date) query = query.lte("reporting_period", body.end_date);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: orgId,
    entity_type: "report", action: "REPORT_GENERATED",
    new_value: { report_type: "asset", filters: body }, timestamp: now
  });

  await publishEvent({ event_name: "report.generated" as never, payload: { report_type: "asset", filters: body }, org_id: orgId, correlation_id: correlationId, source_function: FUNCTION_NAME });

  log.info({ correlationId, orgId, count }, "Asset report generated");

  return {
    org_id: orgId,
    reporting_period: `${body.start_date ?? 'all'} to ${body.end_date ?? 'now'}`,
    data: data ?? [],
    total: count ?? 0,
  };
}
