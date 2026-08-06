/**
 * workorder/efn-wo-search/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Role-scoped work order search with filters, sorting, and pagination.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { WoSearchResult } from "./types.ts";
import type { WoSearchInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-wo-search";

export async function searchWorkOrders(
  body:          WoSearchInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<WoSearchResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Scope Resolution ────────────────────────────────────────────
  let orgScope:    string | null = body.org_id ?? null;
  let vendorScope: string | null = body.vendor_id ?? null;
  let techScope:   string | null = body.technician_id ?? null;

  if (!claims.is_platform_admin) {
    if (claims.org_id) {
      if (body.org_id && body.org_id !== claims.org_id) {
        throw new ForbiddenError("Cannot search work orders in a different organization", correlationId);
      }
      orgScope = claims.org_id;
    }
    if (claims.vendor_id) vendorScope = claims.vendor_id;
    if (claims.app_role === "technician") techScope = claims.sub;
  }

  // ── 2. Build Query ─────────────────────────────────────────────────
  let query = db.from("work_orders")
    .select(
      "id, work_order_number, ticket_id, org_id, vendor_id, technician_id, asset_id, priority, status, scheduled_start_at, scheduled_end_at, created_at",
      { count: "exact" }
    )
    .is("deleted_at", null);

  if (orgScope)    query = query.eq("org_id", orgScope);
  if (vendorScope) query = query.eq("vendor_id", vendorScope);
  if (techScope)   query = query.eq("technician_id", techScope);
  if (body.ticket_id) query = query.eq("ticket_id", body.ticket_id);
  if (body.asset_id)  query = query.eq("asset_id", body.asset_id);
  if (body.status)    query = query.eq("status", body.status);
  if (body.priority)  query = query.eq("priority", body.priority);

  if (body.overdue_only) {
    const now = new Date().toISOString();
    query = query.lt("scheduled_end_at", now).not("status", "in", `(completed,closed)`);
  }

  if (body.search_term) {
    query = query.ilike("work_order_number", `%${body.search_term}%`);
  }

  query = query
    .order(body.sort_by!, { ascending: body.sort_dir === "asc" })
    .range(body.offset!, body.offset! + body.limit! - 1);

  // ── 3. Execute ─────────────────────────────────────────────────────
  const { data, count, error } = await query;
  if (error) throw new Error(`WO search failed: ${error.message}`);

  log.info({ correlationId, total: count, limit: body.limit, offset: body.offset }, "WO search executed");

  return {
    data: (data ?? []).map((r: Record<string, unknown>) => ({
      id:                r["id"] as string,
      work_order_number: r["work_order_number"] as string,
      ticket_id:         r["ticket_id"] as string,
      org_id:            r["org_id"] as string,
      vendor_id:         r["vendor_id"] as string | null,
      technician_id:     r["technician_id"] as string | null,
      asset_id:          r["asset_id"] as string | null,
      priority:          r["priority"] as string,
      status:            r["status"] as string,
      scheduled_start_at: r["scheduled_start_at"] as string | null,
      scheduled_end_at:   r["scheduled_end_at"] as string | null,
      created_at:        r["created_at"] as string,
    })),
    total:  count ?? 0,
    limit:  body.limit!,
    offset: body.offset!,
  };
}
