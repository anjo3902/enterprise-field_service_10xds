/**
 * asset/efn-asset-dashboard/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Generates an aggregated dashboard of assets for an organization.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { AssetDashboardResult } from "./types.ts";
import type { AssetDashboardInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-asset-dashboard";

export async function getAssetDashboard(
  body:          AssetDashboardInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<AssetDashboardResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Access Control / Scoping ───────────────────────────────────
  let targetOrgId = body.org_id;

  if (!claims.is_platform_admin) {
    if (claims.org_id) {
      if (body.org_id && body.org_id !== claims.org_id) {
        throw new ForbiddenError("Cannot view dashboard outside your organization", correlationId);
      }
      targetOrgId = claims.org_id;
    } else {
      throw new ForbiddenError("Vendors and Technicians cannot view the global asset dashboard", correlationId);
    }
  }

  if (!targetOrgId) {
    throw new ForbiddenError("org_id is required for platform admins", correlationId);
  }

  // ── 2. Run Aggregations ───────────────────────────────────────────
  const { data: assets, error } = await db
    .from("assets")
    .select("status, health, warranty_expiry, amc_expiry")
    .eq("org_id", targetOrgId)
    .is("deleted_at", null);

  if (error) throw new Error(`Dashboard aggregation failed: ${error.message}`);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const res: AssetDashboardResult = {
    org_id: targetOrgId,
    asset_summary: { total_assets: 0, active: 0, maintenance: 0, inactive: 0, decommissioned: 0 },
    health_overview: { healthy: 0, warning: 0, critical: 0 },
    warranty_summary: { expired: 0, expiring_soon: 0, valid: 0 },
    amc_summary: { expired: 0, expiring_soon: 0, valid: 0 },
  };

  for (const a of (assets ?? [])) {
    res.asset_summary.total_assets++;

    // Status
    if (a.status === "Active") res.asset_summary.active++;
    else if (a.status === "Maintenance") res.asset_summary.maintenance++;
    else if (a.status === "Inactive") res.asset_summary.inactive++;
    else if (a.status === "Decommissioned") res.asset_summary.decommissioned++;

    // Health
    if (a.health === "Healthy") res.health_overview.healthy++;
    else if (a.health === "Warning" || a.health === "Needs Attention") res.health_overview.warning++;
    else if (a.health === "Critical") res.health_overview.critical++;

    // Warranty
    if (a.warranty_expiry) {
      const wDate = new Date(a.warranty_expiry);
      if (wDate < now) res.warranty_summary.expired++;
      else if (wDate <= thirtyDaysFromNow) res.warranty_summary.expiring_soon++;
      else res.warranty_summary.valid++;
    }

    // AMC
    if (a.amc_expiry) {
      const aDate = new Date(a.amc_expiry);
      if (aDate < now) res.amc_summary.expired++;
      else if (aDate <= thirtyDaysFromNow) res.amc_summary.expiring_soon++;
      else res.amc_summary.valid++;
    }
  }

  log.info({ correlationId, org_id: targetOrgId, total: res.asset_summary.total_assets }, "Asset dashboard generated");
  return res;
}
