/**
 * reporting/efn-report-operational/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles retrieval of aggregated operational metrics.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { OperationalReportResult } from "./types.ts";
import type { OperationalReportInput } from "./schema.ts";

const FUNCTION_NAME = "efn-report-operational";

export async function handleOperationalReport(
  body:          OperationalReportInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<OperationalReportResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  const orgId = claims.is_platform_admin ? (body.org_id ?? claims.org_id) : claims.org_id;
  if (!orgId) throw new ForbiddenError("org_id is required", correlationId);

  // Fetch aggregated operational metrics from `platform_analytics`
  let query = db.from("platform_analytics")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .order("reporting_date", { ascending: false })
    .range(body.offset!, body.offset! + body.limit! - 1);

  if (body.start_date) query = query.gte("reporting_date", body.start_date);
  if (body.end_date) query = query.lte("reporting_date", body.end_date);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  // Audit report generation
  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: orgId,
    entity_type: "report", action: "REPORT_GENERATED",
    new_value: { report_type: "operational", filters: body }, timestamp: now
  });

  await publishEvent({ event_name: "report.generated" as never, payload: { report_type: "operational", filters: body }, org_id: orgId, correlation_id: correlationId, source_function: FUNCTION_NAME });

  log.info({ correlationId, orgId, count }, "Operational report generated");

  return {
    org_id: orgId,
    reporting_period: `${body.start_date ?? 'all'} to ${body.end_date ?? 'now'}`,
    data: data ?? [],
    total: count ?? 0,
  };
}
