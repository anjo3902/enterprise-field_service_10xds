/**
 * dispatch/efn-dispatch-search/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Role-scoped dispatch schedule search with filters and pagination.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { DispatchSearchResult } from "./types.ts";
import type { DispatchSearchInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-dispatch-search";

export async function searchDispatches(
  body:          DispatchSearchInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<DispatchSearchResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Scope ───────────────────────────────────────────────────────
  let vendorScope: string | null = body.vendor_id ?? null;
  let techScope:   string | null = body.technician_id ?? null;

  if (!claims.is_platform_admin) {
    if (claims.vendor_id) vendorScope = claims.vendor_id;
    if (claims.app_role === "technician") techScope = claims.sub;
  }

  // ── 2. Build Query ─────────────────────────────────────────────────
  let query = db.from("dispatch_schedules")
    .select("id, work_order_id, technician_id, vendor_id, scheduled_start_at, scheduled_end_at, dispatch_status, route_status, estimated_travel_mins, created_at", { count: "exact" })
    .is("deleted_at", null);

  if (vendorScope) query = query.eq("vendor_id", vendorScope);
  if (techScope)   query = query.eq("technician_id", techScope);
  if (body.work_order_id)   query = query.eq("work_order_id", body.work_order_id);
  if (body.dispatch_status) query = query.eq("dispatch_status", body.dispatch_status);
  if (body.route_status)    query = query.eq("route_status", body.route_status);
  if (body.from_date)       query = query.gte("scheduled_start_at", body.from_date);
  if (body.to_date)         query = query.lte("scheduled_end_at", body.to_date);

  if (body.overdue_only) {
    query = query.lt("scheduled_end_at", now).not("dispatch_status", "in", "(completed,cancelled)");
  }

  query = query
    .order(body.sort_by!, { ascending: body.sort_dir === "asc" })
    .range(body.offset!, body.offset! + body.limit! - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(`Dispatch search failed: ${error.message}`);

  log.info({ correlationId, total: count, limit: body.limit }, "Dispatch search executed");

  return {
    data: (data ?? []).map((r: Record<string, unknown>) => ({
      id:                  r["id"] as string,
      work_order_id:       r["work_order_id"] as string,
      technician_id:       r["technician_id"] as string,
      vendor_id:           r["vendor_id"] as string | null,
      scheduled_start_at:  r["scheduled_start_at"] as string,
      scheduled_end_at:    r["scheduled_end_at"] as string,
      dispatch_status:     r["dispatch_status"] as string,
      route_status:        r["route_status"] as string,
      estimated_travel_mins: r["estimated_travel_mins"] as number | null,
      created_at:          r["created_at"] as string,
    })),
    total:  count ?? 0,
    limit:  body.limit!,
    offset: body.offset!,
  };
}
