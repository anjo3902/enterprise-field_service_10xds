/**
 * maintenance/efn-pm-dashboard/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Aggregates KPI metrics for preventive maintenance, AMCs, and warranties.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { PmDashboardResult } from "./types.ts";
import type { PmDashboardInput } from "./schema.ts";

const FUNCTION_NAME = "efn-pm-dashboard";

export async function getPmDashboard(
  body:          PmDashboardInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<PmDashboardResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  
  const orgId = claims.is_platform_admin ? (body.org_id ?? claims.org_id) : claims.org_id;
  if (!orgId) throw new ForbiddenError("org_id is required", correlationId);

  const vendorId = body.vendor_id ?? claims.vendor_id;

  const today = new Date();
  const next30Days = new Date(today);
  next30Days.setDate(today.getDate() + 30);
  const todayStr = today.toISOString().split("T")[0];
  const next30Str = next30Days.toISOString().split("T")[0];

  let pmQuery = db.from("pm_schedules").select("status, pm_plans!inner(org_id, vendor_id)", { count: "exact", head: true });
  if (vendorId) pmQuery = pmQuery.eq("pm_plans.vendor_id", vendorId);
  else pmQuery = pmQuery.eq("pm_plans.org_id", orgId);
  
  const { count: upcomingCount } = await pmQuery.eq("status", "requested").gte("scheduled_date", todayStr).lte("scheduled_date", next30Str);
  const { count: overdueCount }  = await pmQuery.eq("status", "overdue");

  // total completed vs scheduled (simplified completion rate logic for demo)
  const { count: completedCount } = await pmQuery.eq("status", "completed");
  const { count: totalCount } = await pmQuery;
  const completionRate = totalCount && totalCount > 0 ? ((completedCount ?? 0) / totalCount) * 100 : 100;

  let amcQuery = db.from("amc_contracts").select("id", { count: "exact", head: true });
  if (vendorId) amcQuery = amcQuery.eq("vendor_id", vendorId);
  else amcQuery = amcQuery.eq("org_id", orgId);
  const { count: expiringAmcs } = await amcQuery.eq("status", "active").gte("end_date", todayStr).lte("end_date", next30Str);

  let warrantyQuery = db.from("warranty_records").select("id, assets!inner(org_id)", { count: "exact", head: true });
  if (vendorId) warrantyQuery = warrantyQuery.eq("vendor_id", vendorId);
  else warrantyQuery = warrantyQuery.eq("assets.org_id", orgId);
  const { count: expiringWarranties } = await warrantyQuery.eq("status", "activated").gte("end_date", todayStr).lte("end_date", next30Str);

  log.info({ correlationId, orgId }, "Dashboard metrics aggregated");

  return {
    org_id: orgId,
    upcoming_pms: upcomingCount ?? 0,
    overdue_pms: overdueCount ?? 0,
    expiring_amcs: expiringAmcs ?? 0,
    expiring_warranties: expiringWarranties ?? 0,
    maintenance_completion_rate: Math.round(completionRate * 10) / 10,
    asset_maintenance_score: Math.round(completionRate * 10) / 10,
  };
}
