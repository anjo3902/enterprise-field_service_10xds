/**
 * organization/efn-org-dashboard/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Retrieves the dashboard snapshot for an organization.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { DashboardResult } from "./types.ts";
import type { GetDashboardInput } from "./schema.ts";

const FUNCTION_NAME = "efn-org-dashboard";

export async function getOrgDashboard(
  body:          GetDashboardInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<DashboardResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Tenant Isolation ───────────────────────────────────────────
  if (!claims.is_platform_admin && claims.org_id !== body.org_id) {
    throw new ForbiddenError("Cannot view dashboard for a different organization", correlationId);
  }

  const reportingDate = body.reporting_date ?? nowUtc().substring(0, 10);

  // ── 2. Read Latest Dashboard Snapshot ─────────────────────────────
  // Snapshots are pre-computed nightly or periodically by a separate process.
  const { data: snapshot, error: snapErr } = await db
    .from("dashboard_snapshots")
    .select("summary_data, widget_data, reporting_date")
    .eq("dashboard_type", "org_executive")
    .eq("org_id", body.org_id)
    .lte("reporting_date", reportingDate)
    .order("reporting_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapErr) {
    log.error({ correlationId, error: snapErr.message }, "Error fetching dashboard snapshot");
    throw new Error(`Error fetching dashboard snapshot: ${snapErr.message}`);
  }

  // ── 3. Read Real-time Top-level Stats (optional hybrid approach) ──
  const { data: org, error: orgErr } = await db
    .from("organizations")
    .select("ticket_count, asset_count")
    .eq("id", body.org_id)
    .maybeSingle();

  if (orgErr || !org) throw new NotFoundError("Organization", correlationId);

  log.info({ correlationId, org_id: body.org_id, date: snapshot ? snapshot.reporting_date : reportingDate }, "Dashboard retrieved");

  return {
    org_id:         body.org_id,
    reporting_date: snapshot ? (snapshot as any).reporting_date : reportingDate,
    summary: {
      ticket_count: (org as any).ticket_count ?? 0,
      asset_count:  (org as any).asset_count ?? 0,
      sla_rate:     snapshot ? (snapshot.summary_data as any).sla_rate ?? null : null,
    },
    snapshot: snapshot ? (snapshot as any).widget_data : {},
  };
}
