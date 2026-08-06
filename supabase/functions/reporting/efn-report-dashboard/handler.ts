/**
 * reporting/efn-report-dashboard/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Retrieves pre-computed JSON snapshots for instant dashboard rendering.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { DashboardResult } from "./types.ts";
import type { DashboardInput } from "./schema.ts";

const FUNCTION_NAME = "efn-report-dashboard";

export async function handleDashboard(
  body:          DashboardInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<DashboardResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  const orgId = claims.is_platform_admin ? (body.org_id ?? claims.org_id) : claims.org_id;
  if (!orgId) throw new ForbiddenError("org_id is required", correlationId);

  const vendorId = (claims.app_role === "vendor_admin") ? claims.vendor_id : body.vendor_id;
  
  // Default to today if not provided
  const reportingDate = body.reporting_date ?? new Date().toISOString().split('T')[0];

  let query = db.from("dashboard_snapshots")
    .select("summary_data, widget_data")
    .eq("dashboard_type", body.dashboard_type)
    .eq("org_id", orgId)
    .eq("reporting_date", reportingDate);

  if (vendorId) query = query.eq("vendor_id", vendorId);
  else query = query.is("vendor_id", null);

  const { data: snapshot } = await query.maybeSingle();

  if (!snapshot) {
    throw new NotFoundError(`Dashboard snapshot for ${reportingDate}`, correlationId);
  }

  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: orgId,
    entity_type: "dashboard", action: "DASHBOARD_VIEWED",
    new_value: { dashboard_type: body.dashboard_type, reporting_date: reportingDate }, timestamp: now
  });

  await publishEvent({ event_name: "dashboard.viewed" as never, payload: { dashboard_type: body.dashboard_type }, org_id: orgId, correlation_id: correlationId, source_function: FUNCTION_NAME });

  log.info({ correlationId, orgId, dashboard_type: body.dashboard_type }, "Dashboard retrieved");

  return {
    org_id: orgId,
    vendor_id: vendorId,
    dashboard_type: body.dashboard_type,
    reporting_date: reportingDate,
    summary_data: snapshot.summary_data,
    widget_data: snapshot.widget_data,
  };
}
