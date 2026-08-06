/**
 * vendor/efn-vendor-performance/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Retrieves vendor KPI summary with period-based analytics.
 *
 * Access:
 *   system_admin    → any vendor
 *   vendor_admin    → own vendor only
 *   org_admin/user  → vendors under active contracts with their org only
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims }          from "../../shared/auth/types.ts";
import type { PerformanceSummary } from "./types.ts";
import type { PerformanceQueryInput } from "./schema.ts";

const FUNCTION_NAME = "efn-vendor-performance";
const MAX_PERIODS   = 12;

export async function getVendorPerformance(
  body:          PerformanceQueryInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<PerformanceSummary> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.vendor_id && claims.vendor_id !== body.vendor_id) {
      throw new ForbiddenError("Cannot view performance data for a different vendor", correlationId);
    }
    // Org users may view vendors they have active contracts with
    if (claims.org_id && !claims.vendor_id) {
      const { data: contract } = await db
        .from("contracts")
        .select("id")
        .eq("org_id", claims.org_id)
        .eq("vendor_id", body.vendor_id)
        .eq("status", "active")
        .maybeSingle();

      if (!contract) {
        throw new ForbiddenError("No active contract exists between your organization and this vendor", correlationId);
      }
    }
  }

  // ── 2. Load Vendor (for current denormalized metrics) ─────────────
  const { data: vendor, error: vendorErr } = await db
    .from("vendors")
    .select("rating, sla_compliance, sla_target")
    .eq("id", body.vendor_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (vendorErr || !vendor) throw new NotFoundError("Vendor", correlationId);

  // ── 3. Query Performance Metrics ─────────────────────────────────
  let query = db
    .from("vendor_performance_metrics")
    .select("*")
    .eq("vendor_id", body.vendor_id)
    .order("reporting_period", { ascending: false })
    .limit(MAX_PERIODS);

  if (body.from_date) query = query.gte("reporting_period", body.from_date);
  if (body.to_date)   query = query.lte("reporting_period", body.to_date);

  const { data: metrics, error: metricsErr } = await query;
  if (metricsErr) throw new Error(`Failed to fetch performance metrics: ${metricsErr.message}`);

  log.info({ correlationId, vendor_id: body.vendor_id, periods: (metrics ?? []).length }, "Performance data retrieved");

  return {
    vendor_id:              body.vendor_id,
    current_rating:         (vendor as Record<string, number | null>)["rating"],
    current_sla_compliance: (vendor as Record<string, number | null>)["sla_compliance"],
    current_sla_target:     (vendor as Record<string, number>)["sla_target"],
    periods: (metrics ?? []).map((m: Record<string, unknown>) => ({
      reporting_period:         m["reporting_period"] as string,
      tickets_completed:        m["tickets_completed"] as number,
      avg_response_time_mins:   m["avg_response_time_mins"] as number | null,
      avg_resolution_time_mins: m["avg_resolution_time_mins"] as number | null,
      sla_compliance_pct:       m["sla_compliance_pct"] as number | null,
      customer_rating:          m["customer_rating"] as number | null,
      performance_score:        m["performance_score"] as number | null,
      revenue:                  m["revenue"] as number,
      cost:                     m["cost"] as number,
    })),
  };
}
