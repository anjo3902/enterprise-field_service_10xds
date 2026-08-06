/**
 * ticket/efn-ticket-history/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Retrieves the full immutable timeline of a ticket:
 *  - Status transitions (ticket_status_history)
 *  - Assignment log (ticket_assignments)
 *  - Public/internal comments (ticket_comments)
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { TicketHistoryResult } from "./types.ts";
import type { TicketHistoryInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-ticket-history";

export async function getTicketHistory(
  body:          TicketHistoryInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<TicketHistoryResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Load Ticket ─────────────────────────────────────────────────
  const { data: ticket, error: tErr } = await db
    .from("tickets")
    .select("org_id, vendor_id, ticket_number")
    .eq("id", body.ticket_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (tErr || !ticket) throw new NotFoundError("Ticket", correlationId);
  const t = ticket as Record<string, string | null>;

  // ── 2. Access Control ──────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== t["org_id"]) {
      throw new ForbiddenError("Cannot view history for a ticket in a different organization", correlationId);
    }
    if (claims.vendor_id && claims.vendor_id !== t["vendor_id"]) {
      throw new ForbiddenError("Your vendor is not assigned to this ticket", correlationId);
    }
  }

  const include = body.include!;

  // ── 3. Parallel Queries ────────────────────────────────────────────
  const [statusData, assignData, commentData] = await Promise.all([
    include.includes("status")
      ? db.from("ticket_status_history").select("*").eq("ticket_id", body.ticket_id)
          .order("changed_at", { ascending: true }).limit(body.limit!)
      : Promise.resolve({ data: [], error: null }),
    include.includes("assignments")
      ? db.from("ticket_assignments").select("*").eq("ticket_id", body.ticket_id)
          .order("assigned_at", { ascending: true }).limit(body.limit!)
      : Promise.resolve({ data: [], error: null }),
    include.includes("comments")
      ? db.from("ticket_comments").select("*").eq("ticket_id", body.ticket_id)
          .is("deleted_at", null)
          .not("visibility", "eq", claims.is_platform_admin ? "none" : "private")
          .order("created_at", { ascending: true }).limit(body.limit!)
      : Promise.resolve({ data: [], error: null }),
  ]);

  log.info({ correlationId, ticket_id: body.ticket_id }, "Ticket history fetched");

  return {
    ticket_id:     body.ticket_id,
    ticket_number: t["ticket_number"] as string,
    status_history: (statusData.data ?? []).map((s: Record<string, unknown>) => ({
      id:              s["id"] as string,
      previous_status: s["previous_status"] as string | null,
      new_status:      s["new_status"] as string,
      changed_by:      s["changed_by"] as string | null,
      reason:          s["reason"] as string | null,
      changed_at:      s["changed_at"] as string,
    })),
    assignments: (assignData.data ?? []).map((a: Record<string, unknown>) => ({
      id:                a["id"] as string,
      vendor_id:         a["vendor_id"] as string | null,
      technician_id:     a["technician_id"] as string | null,
      assigned_by:       a["assigned_by"] as string | null,
      assignment_status: a["assignment_status"] as string,
      assigned_at:       a["assigned_at"] as string,
      reason:            a["reason"] as string | null,
    })),
    comments: (commentData.data ?? []).map((c: Record<string, unknown>) => ({
      id:           c["id"] as string,
      body:         c["body"] as string,
      comment_type: c["comment_type"] as string,
      visibility:   c["visibility"] as string,
      author_id:    c["author_id"] as string | null,
      created_at:   c["created_at"] as string,
    })),
  };
}
