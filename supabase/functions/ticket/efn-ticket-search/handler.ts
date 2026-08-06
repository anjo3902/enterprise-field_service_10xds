/**
 * ticket/efn-ticket-search/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Multi-filter, paginated ticket search.
 * Role-scoped: org users see their org, vendors see assigned tickets.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { TicketSearchResult } from "./types.ts";
import type { TicketSearchInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-ticket-search";

export async function searchTickets(
  body:          TicketSearchInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<TicketSearchResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Scope Resolution ────────────────────────────────────────────
  let orgScope:    string | null = body.org_id ?? null;
  let vendorScope: string | null = body.vendor_id ?? null;

  if (!claims.is_platform_admin) {
    if (claims.org_id) {
      if (body.org_id && body.org_id !== claims.org_id) {
        throw new ForbiddenError("Cannot search tickets in a different organization", correlationId);
      }
      orgScope = claims.org_id;
    } else if (claims.vendor_id) {
      vendorScope = claims.vendor_id;
    } else if (claims.app_role === "technician") {
      // Technicians only see their assigned tickets; handled via assigned_technician_id
    }
  }

  // ── 2. Build Query ─────────────────────────────────────────────────
  let query = db.from("tickets")
    .select(
      "id, ticket_number, title, priority, status, org_id, vendor_id, asset_id, created_at, resolution_due_at, response_sla_status, resolution_sla_status",
      { count: "exact" }
    )
    .is("deleted_at", null);

  if (orgScope)    query = query.eq("org_id", orgScope);
  if (vendorScope) query = query.eq("vendor_id", vendorScope);
  if (body.status)               query = query.eq("status", body.status);
  if (body.priority)             query = query.eq("priority", body.priority);
  if (body.asset_id)             query = query.eq("asset_id", body.asset_id);
  if (body.service_category_id)  query = query.eq("service_category_id", body.service_category_id);
  if (body.assigned_technician_id) query = query.eq("assigned_technician_id", body.assigned_technician_id);

  if (body.sla_breached === true) {
    query = query.or("response_sla_status.eq.breached,resolution_sla_status.eq.breached");
  }

  if (body.search_term) {
    // ilike on title and ticket_number for basic keyword search
    const term = `%${body.search_term}%`;
    query = query.or(`title.ilike.${term},ticket_number.ilike.${term}`);
  }

  query = query
    .order(body.sort_by!, { ascending: body.sort_dir === "asc" })
    .range(body.offset!, body.offset! + body.limit! - 1);

  // ── 3. Execute ─────────────────────────────────────────────────────
  const { data, count, error } = await query;
  if (error) throw new Error(`Ticket search failed: ${error.message}`);

  log.info({ correlationId, total: count, limit: body.limit, offset: body.offset }, "Ticket search executed");

  return {
    data: (data ?? []).map((r: Record<string, unknown>) => ({
      id:                    r["id"] as string,
      ticket_number:         r["ticket_number"] as string,
      title:                 r["title"] as string,
      priority:              r["priority"] as string,
      status:                r["status"] as string,
      org_id:                r["org_id"] as string,
      vendor_id:             r["vendor_id"] as string | null,
      asset_id:              r["asset_id"] as string | null,
      created_at:            r["created_at"] as string,
      resolution_due_at:     r["resolution_due_at"] as string | null,
      response_sla_status:   r["response_sla_status"] as string | null,
      resolution_sla_status: r["resolution_sla_status"] as string | null,
    })),
    total:  count ?? 0,
    limit:  body.limit!,
    offset: body.offset!,
  };
}
