/**
 * dispatch/efn-dispatch-board/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Live Dispatch Board: real-time technician statuses + active WOs.
 * Designed for the dispatcher's map-ready command center.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { DispatchBoardResult } from "./types.ts";
import type { DispatchBoardInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-dispatch-board";

export async function getDispatchBoard(
  body:          DispatchBoardInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<DispatchBoardResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Scope ───────────────────────────────────────────────────────
  let orgScope:    string | null = body.org_id ?? null;
  let vendorScope: string | null = body.vendor_id ?? null;

  if (!claims.is_platform_admin) {
    if (claims.org_id) {
      if (body.org_id && body.org_id !== claims.org_id) throw new ForbiddenError("Cannot view board for a different organization", correlationId);
      orgScope = claims.org_id;
    }
    if (claims.vendor_id) vendorScope = claims.vendor_id;
    if (!orgScope && !vendorScope) throw new ForbiddenError("No org or vendor scope available", correlationId);
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  // ── 2. Fetch Technicians via Availability ──────────────────────────
  let techQuery = db.from("technician_availability")
    .select("technician_id, availability_status, current_work_order_id, current_latitude, current_longitude, next_available_at");

  if (vendorScope) {
    const { data: vTechs } = await db.from("technicians").select("id").eq("vendor_id", vendorScope).is("deleted_at", null);
    const ids = (vTechs ?? []).map((t: Record<string, string>) => t["id"]);
    if (ids.length > 0) techQuery = techQuery.in("technician_id", ids);
  }

  // ── 3. Fetch Active Work Orders ────────────────────────────────────
  let woQuery = db.from("work_orders")
    .select("id, work_order_number, status, priority, technician_id, scheduled_start_at, scheduled_end_at")
    .not("status", "in", "(completed,closed)")
    .is("deleted_at", null);

  if (orgScope)    woQuery = woQuery.eq("org_id", orgScope);
  if (vendorScope) woQuery = woQuery.eq("vendor_id", vendorScope);

  const [{ data: techData }, { data: woData }] = await Promise.all([techQuery, woQuery]);

  // ── 4. Aggregate ───────────────────────────────────────────────────
  const techs = (techData ?? []) as Record<string, unknown>[];
  const wos   = (woData   ?? []) as Record<string, unknown>[];

  let available = 0, busy = 0, offline = 0;
  for (const tech of techs) {
    const s = tech["availability_status"] as string;
    if (s === "available") available++;
    else if (s === "busy" || s === "on_site") busy++;
    else offline++;
  }

  let overdue = 0, scheduledToday = 0;
  const woBoardEntries = wos.map((wo) => {
    const endAt = wo["scheduled_end_at"] ? new Date(wo["scheduled_end_at"] as string) : null;
    const startAt = wo["scheduled_start_at"] ? new Date(wo["scheduled_start_at"] as string) : null;
    const isOverdue = !!endAt && endAt < new Date(now) && !["completed", "closed"].includes(wo["status"] as string);
    const isToday   = !!startAt && startAt >= todayStart && startAt < todayEnd;
    if (isOverdue)  overdue++;
    if (isToday)    scheduledToday++;
    return {
      work_order_id:     wo["id"] as string,
      work_order_number: wo["work_order_number"] as string,
      status:            wo["status"] as string,
      priority:          wo["priority"] as string,
      technician_id:     wo["technician_id"] as string | null,
      scheduled_start_at: wo["scheduled_start_at"] as string | null,
      scheduled_end_at:   wo["scheduled_end_at"] as string | null,
      is_overdue:        isOverdue,
    };
  });

  log.info({ correlationId, techs: techs.length, wos: wos.length }, "Dispatch board loaded");
  return {
    org_id:       orgScope ?? vendorScope ?? "",
    generated_at: now,
    technicians: techs.map((t) => ({
      technician_id:          t["technician_id"] as string,
      availability_status:    t["availability_status"] as string,
      current_work_order_id:  t["current_work_order_id"] as string | null,
      current_lat:            t["current_latitude"] as number | undefined,
      current_lng:            t["current_longitude"] as number | undefined,
      next_available_at:      t["next_available_at"] as string | undefined,
    })),
    work_orders: woBoardEntries,
    summary: {
      total_techs:        techs.length,
      available_techs:    available,
      busy_techs:         busy,
      offline_techs:      offline,
      active_work_orders: wos.length,
      overdue_count:      overdue,
      scheduled_today:    scheduledToday,
    },
  };
}
