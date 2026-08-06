/**
 * vendor/efn-vendor-dashboard/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Returns the vendor dashboard: pre-computed snapshot + real-time live stats.
 *
 * Live stats are pulled from the vendors table (denormalized by pg_cron).
 * Snapshot is from dashboard_snapshots (type: vendor_performance).
 * Org users may only view vendors they have active contracts with.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims }            from "../../shared/auth/types.ts";
import type { VendorDashboardResult } from "./types.ts";
import type { VendorDashboardInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-vendor-dashboard";

export async function getVendorDashboard(
  body:          VendorDashboardInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<VendorDashboardResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.vendor_id && claims.vendor_id !== body.vendor_id) {
      throw new ForbiddenError("Cannot view dashboard for a different vendor", correlationId);
    }
    if (claims.org_id && !claims.vendor_id) {
      const { data: contract } = await db
        .from("contracts")
        .select("id")
        .eq("org_id", claims.org_id)
        .eq("vendor_id", body.vendor_id)
        .eq("status", "active")
        .maybeSingle();
      if (!contract) throw new ForbiddenError("No active contract with this vendor", correlationId);
    }
  }

  const reportingDate = body.reporting_date ?? nowUtc().substring(0, 10);

  // ── 2. Load Vendor Live Stats ─────────────────────────────────────
  const { data: vendor, error: vendorErr } = await db
    .from("vendors")
    .select("technician_count, rating, sla_compliance, sla_target")
    .eq("id", body.vendor_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (vendorErr || !vendor) throw new NotFoundError("Vendor", correlationId);

  // ── 3. Count Active Contracts ─────────────────────────────────────
  const { count: activeContracts } = await db
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", body.vendor_id)
    .eq("status", "active");

  // ── 4. Load Dashboard Snapshot ────────────────────────────────────
  const { data: snapshot } = await db
    .from("dashboard_snapshots")
    .select("widget_data, reporting_date")
    .eq("dashboard_type", "vendor_performance")
    .eq("vendor_id", body.vendor_id)
    .lte("reporting_date", reportingDate)
    .order("reporting_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const v = vendor as Record<string, number | null>;

  log.info({ correlationId, vendor_id: body.vendor_id }, "Vendor dashboard retrieved");

  return {
    vendor_id:      body.vendor_id,
    reporting_date: (snapshot as Record<string, string> | null)?.["reporting_date"] ?? reportingDate,
    live_stats: {
      technician_count:  (v["technician_count"] as number) ?? 0,
      rating:            v["rating"] ?? null,
      sla_compliance:    v["sla_compliance"] ?? null,
      sla_target:        (v["sla_target"] as number) ?? 90,
      active_contracts:  activeContracts ?? 0,
    },
    snapshot: (snapshot as { widget_data: Record<string, unknown> } | null)?.widget_data ?? {},
  };
}
