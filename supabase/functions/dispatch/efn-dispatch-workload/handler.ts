/**
 * dispatch/efn-dispatch-workload/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Calculates workload utilization per technician within a time window.
 * Generates rebalancing recommendations.
 *
 * Utilization = scheduled_hours / (max_hours_day × period_days) × 100
 * Thresholds:
 *   < 50%  → underutilized
 *   50–80% → balanced
 *   > 80%  → overloaded
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { WorkloadResult, TechWorkloadEntry } from "./types.ts";
import type { DispatchWorkloadInput } from "./schema.ts";

const FUNCTION_NAME = "efn-dispatch-workload";

export async function analyzeWorkload(
  body:          DispatchWorkloadInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<WorkloadResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Scope ───────────────────────────────────────────────────────
  let orgScope:    string | null = body.org_id ?? null;
  let vendorScope: string | null = body.vendor_id ?? null;

  if (!claims.is_platform_admin) {
    if (claims.org_id) {
      if (body.org_id && body.org_id !== claims.org_id) throw new ForbiddenError("Cannot view workload for a different organization", correlationId);
      orgScope = claims.org_id;
    }
    if (claims.vendor_id) vendorScope = claims.vendor_id;
  }

  const periodStart = body.period_start ?? new Date(Date.now() - 7 * 86400000).toISOString(); // Default: last 7 days
  const periodEnd   = body.period_end   ?? now;
  const periodDays  = Math.max(1, Math.ceil((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86400000));
  const capacityHours = body.max_hours_day! * periodDays;

  // ── 2. Fetch Technician IDs in Scope ──────────────────────────────
  let techQuery = db.from("technicians").select("id").eq("status", "active").is("deleted_at", null);
  if (vendorScope) techQuery = techQuery.eq("vendor_id", vendorScope);
  if (body.technician_id) techQuery = techQuery.eq("id", body.technician_id);

  const { data: techRows } = await techQuery;
  const techIds = (techRows ?? []).map((t: Record<string, string>) => t["id"]);
  if (techIds.length === 0) {
    return { scope: body.technician_id ? "technician" : body.vendor_id ? "vendor" : "org", org_id: orgScope ?? undefined, vendor_id: vendorScope ?? undefined, technician_id: body.technician_id, period: { start: periodStart, end: periodEnd }, technicians: [], summary: { total_hours_scheduled: 0, avg_utilization_pct: 0, overloaded_count: 0, underutilized_count: 0, balanced_count: 0 }, recommendations: [] };
  }

  // ── 3. Fetch Dispatches in Period ─────────────────────────────────
  const { data: schedules } = await db
    .from("dispatch_schedules")
    .select("technician_id, scheduled_start_at, scheduled_end_at")
    .in("technician_id", techIds)
    .gte("scheduled_start_at", periodStart)
    .lte("scheduled_end_at", periodEnd)
    .is("deleted_at", null)
    .not("dispatch_status", "in", "(cancelled)");

  // ── 4. Aggregate per Technician ───────────────────────────────────
  const hoursMap: Record<string, { hours: number; count: number }> = {};
  for (const tid of techIds) hoursMap[tid] = { hours: 0, count: 0 };

  for (const s of (schedules ?? []) as Record<string, string>[]) {
    const id  = s["technician_id"];
    const dur = (new Date(s["scheduled_end_at"]).getTime() - new Date(s["scheduled_start_at"]).getTime()) / 3600000;
    hoursMap[id].hours += dur;
    hoursMap[id].count++;
  }

  let totalHours = 0, overloaded = 0, under = 0, balanced = 0;
  const techEntries: TechWorkloadEntry[] = [];

  for (const [tid, data] of Object.entries(hoursMap)) {
    const util = Math.min(100, parseFloat(((data.hours / capacityHours) * 100).toFixed(1)));
    let status: TechWorkloadEntry["status"] = "balanced";
    if (util > 80)  { status = "overloaded";    overloaded++; }
    else if (util < 50) { status = "underutilized"; under++; }
    else                 { balanced++; }
    totalHours += data.hours;
    techEntries.push({ technician_id: tid, total_hours_scheduled: parseFloat(data.hours.toFixed(2)), active_dispatches: data.count, utilization_pct: util, status });
  }

  const avgUtil = techEntries.length > 0 ? parseFloat((techEntries.reduce((s, t) => s + t.utilization_pct, 0) / techEntries.length).toFixed(1)) : 0;

  // ── 5. Recommendations ────────────────────────────────────────────
  const recommendations: string[] = [];
  if (overloaded > 0) recommendations.push(`${overloaded} technician(s) are overloaded. Consider redistributing work orders.`);
  if (under > 0)      recommendations.push(`${under} technician(s) are underutilized. Assign pending work orders to them.`);
  if (avgUtil < 40)   recommendations.push("Overall utilization is low — review open work orders and dispatch backlog.");

  await publishEvent({ event_name: "dispatch.workload.updated" as never, payload: { org_id: orgScope, vendor_id: vendorScope, avg_utilization: avgUtil, overloaded }, org_id: orgScope ?? "", correlation_id: correlationId, source_function: FUNCTION_NAME });

  log.info({ correlationId, techs: techIds.length, avgUtil }, "Workload analyzed");

  const scope = body.technician_id ? "technician" : body.vendor_id ? "vendor" : "org";
  return {
    scope, org_id: orgScope ?? undefined, vendor_id: vendorScope ?? undefined, technician_id: body.technician_id,
    period: { start: periodStart, end: periodEnd },
    technicians: techEntries,
    summary: { total_hours_scheduled: parseFloat(totalHours.toFixed(2)), avg_utilization_pct: avgUtil, overloaded_count: overloaded, underutilized_count: under, balanced_count: balanced },
    recommendations,
  };
}
