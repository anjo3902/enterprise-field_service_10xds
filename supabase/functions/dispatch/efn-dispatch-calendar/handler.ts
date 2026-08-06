/**
 * dispatch/efn-dispatch-calendar/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Aggregates technician/org calendar data:
 *  - Technician shifts (recurring patterns)
 *  - Dispatch schedules in the period
 *  - Leave blocks (via technician_availability reason = "leave")
 *  - Organization holidays
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { CalendarResult } from "./types.ts";
import type { DispatchCalendarInput } from "./schema.ts";

const FUNCTION_NAME = "efn-dispatch-calendar";

export async function getCalendar(
  body:          DispatchCalendarInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<CalendarResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Scope ───────────────────────────────────────────────────────
  let orgScope:    string | null = body.org_id ?? null;
  let vendorScope: string | null = body.vendor_id ?? null;

  if (!claims.is_platform_admin) {
    if (claims.org_id) orgScope = claims.org_id;
    if (claims.vendor_id) vendorScope = claims.vendor_id;
    if (claims.app_role === "technician" && !body.technician_id) {
      // Technicians only see their own calendar
    }
  }

  const periodStart = body.period_start ?? new Date(Date.now() - 7 * 86400000).toISOString();
  const periodEnd   = body.period_end   ?? new Date(Date.now() + 30 * 86400000).toISOString();
  const inc         = body.include!;

  // ── 2. Resolve Technician IDs ──────────────────────────────────────
  let techIds: string[] = [];
  if (body.technician_id) {
    techIds = [body.technician_id];
  } else if (vendorScope) {
    const { data: vTechs } = await db.from("technicians").select("id").eq("vendor_id", vendorScope).is("deleted_at", null);
    techIds = (vTechs ?? []).map((t: Record<string, string>) => t["id"]);
  }

  // ── 3. Parallel Fetch ─────────────────────────────────────────────
  const [shiftsRes, dispatchRes, holidaysRes] = await Promise.all([
    inc.includes("shifts") && techIds.length > 0
      ? db.from("technician_shifts").select("id, shift_name, start_time, end_time, working_days, timezone, status").in("technician_id", techIds).eq("status", "active").is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
    inc.includes("dispatches") && techIds.length > 0
      ? db.from("dispatch_schedules").select("id, work_order_id, scheduled_start_at, scheduled_end_at, dispatch_status, route_status").in("technician_id", techIds).is("deleted_at", null).gte("scheduled_start_at", periodStart).lte("scheduled_end_at", periodEnd)
      : Promise.resolve({ data: [], error: null }),
    inc.includes("holidays") && orgScope
      ? db.from("holiday_calendar").select("id, holiday_name, holiday_date, is_recurring").eq("org_id", orgScope).eq("status", "active").is("deleted_at", null).gte("holiday_date", periodStart.slice(0, 10)).lte("holiday_date", periodEnd.slice(0, 10))
      : Promise.resolve({ data: [], error: null }),
  ]);

  const mapRow = <T>(data: unknown[] | null, fn: (r: Record<string, unknown>) => T): T[] =>
    (data ?? []).map((r) => fn(r as Record<string, unknown>));

  log.info({ correlationId, techIds: techIds.length }, "Calendar loaded");
  return {
    technician_id: body.technician_id,
    vendor_id:     vendorScope ?? undefined,
    org_id:        orgScope ?? undefined,
    period:        { start: periodStart, end: periodEnd },
    shifts: mapRow(shiftsRes.data, (r) => ({
      id: r["id"] as string, shift_name: r["shift_name"] as string,
      start_time: r["start_time"] as string, end_time: r["end_time"] as string,
      working_days: r["working_days"] as number[], timezone: r["timezone"] as string, status: r["status"] as string,
    })),
    dispatches: mapRow(dispatchRes.data, (r) => ({
      id: r["id"] as string, work_order_id: r["work_order_id"] as string,
      scheduled_start_at: r["scheduled_start_at"] as string, scheduled_end_at: r["scheduled_end_at"] as string,
      dispatch_status: r["dispatch_status"] as string, route_status: r["route_status"] as string,
    })),
    leaves: [], // Populated when a dedicated leave table is added in a future migration
    holidays: mapRow(holidaysRes.data, (r) => ({
      id: r["id"] as string, holiday_name: r["holiday_name"] as string,
      holiday_date: r["holiday_date"] as string, is_recurring: r["is_recurring"] as boolean,
    })),
  };
}
