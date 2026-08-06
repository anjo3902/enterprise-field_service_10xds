/**
 * workorder/efn-wo-dashboard/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Aggregated KPIs for the Work Order management dashboard.
 * Runs parallel queries for WO status, labor, and materials.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { WoDashboardResult } from "./types.ts";
import type { WoDashboardInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-wo-dashboard";

export async function getWoDashboard(
  body:          WoDashboardInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<WoDashboardResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Scope Resolution ────────────────────────────────────────────
  let targetOrgId = body.org_id;

  if (!claims.is_platform_admin) {
    if (!claims.org_id) {
      throw new ForbiddenError("Dashboard is not available for vendor/technician roles", correlationId);
    }
    if (body.org_id && body.org_id !== claims.org_id) {
      throw new ForbiddenError("Cannot view dashboard for a different organization", correlationId);
    }
    targetOrgId = claims.org_id;
  }

  if (!targetOrgId) throw new ForbiddenError("org_id is required for platform admins", correlationId);

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const now = new Date().toISOString();

  // ── 2. Parallel Queries ────────────────────────────────────────────
  const [woData, laborData, partsData] = await Promise.all([
    db.from("work_orders")
      .select("status, priority, completed_at, scheduled_end_at")
      .eq("org_id", targetOrgId)
      .is("deleted_at", null),
    db.from("work_order_labor")
      .select("hours_worked, travel_time_hours, overtime_hours, work_order_id")
      .in(
        "work_order_id",
        // Sub-select WO IDs for this org — workaround for no direct JOIN in PostgREST
        (await db.from("work_orders").select("id").eq("org_id", targetOrgId).is("deleted_at", null))
          .data?.map((r: Record<string, string>) => r["id"]) ?? []
      ),
    db.from("work_order_parts_used")
      .select("quantity, total_cost, work_order_id")
      .in(
        "work_order_id",
        (await db.from("work_orders").select("id").eq("org_id", targetOrgId).is("deleted_at", null))
          .data?.map((r: Record<string, string>) => r["id"]) ?? []
      ),
  ]);

  // ── 3. Aggregate WO KPIs ──────────────────────────────────────────
  const res: WoDashboardResult = {
    org_id:    targetOrgId,
    summary:   { open: 0, in_progress: 0, completed_today: 0, overdue: 0, total_active: 0 },
    priority:  { critical: 0, high: 0, medium: 0, low: 0 },
    labor:     { total_hours_worked: 0, total_travel_hours: 0, total_overtime_hours: 0 },
    materials: { total_parts_used: 0, total_cost: 0 },
  };

  for (const wo of (woData.data ?? []) as Record<string, unknown>[]) {
    const status   = wo["status"] as string;
    const priority = wo["priority"] as string;
    const completedAt = wo["completed_at"] ? new Date(wo["completed_at"] as string) : null;
    const scheduledEnd = wo["scheduled_end_at"] ? new Date(wo["scheduled_end_at"] as string) : null;

    if (status === "open")        res.summary.open++;
    if (status === "in_progress") res.summary.in_progress++;
    if (status === "completed" && completedAt && completedAt >= todayStart) res.summary.completed_today++;
    if (!["completed", "closed"].includes(status) && scheduledEnd && scheduledEnd < new Date(now)) res.summary.overdue++;
    if (!["completed", "closed"].includes(status)) res.summary.total_active++;

    if (priority === "Critical") res.priority.critical++;
    else if (priority === "High")   res.priority.high++;
    else if (priority === "Medium") res.priority.medium++;
    else if (priority === "Low")    res.priority.low++;
  }

  // ── 4. Aggregate Labor ────────────────────────────────────────────
  for (const lb of (laborData.data ?? []) as Record<string, number>[]) {
    res.labor.total_hours_worked   += lb["hours_worked"]      ?? 0;
    res.labor.total_travel_hours   += lb["travel_time_hours"] ?? 0;
    res.labor.total_overtime_hours += lb["overtime_hours"]    ?? 0;
  }

  // ── 5. Aggregate Materials ────────────────────────────────────────
  for (const pt of (partsData.data ?? []) as Record<string, number>[]) {
    res.materials.total_parts_used += pt["quantity"]   ?? 0;
    res.materials.total_cost       += pt["total_cost"] ?? 0;
  }

  // Round decimals
  res.labor.total_hours_worked   = parseFloat(res.labor.total_hours_worked.toFixed(2));
  res.labor.total_travel_hours   = parseFloat(res.labor.total_travel_hours.toFixed(2));
  res.labor.total_overtime_hours = parseFloat(res.labor.total_overtime_hours.toFixed(2));
  res.materials.total_cost       = parseFloat(res.materials.total_cost.toFixed(2));

  log.info({ correlationId, org_id: targetOrgId, active: res.summary.total_active }, "WO dashboard generated");
  return res;
}
