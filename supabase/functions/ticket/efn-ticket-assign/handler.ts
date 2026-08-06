/**
 * ticket/efn-ticket-assign/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Assigns or reassigns a ticket to a vendor/technician.
 * Records assignment history in ticket_assignments.
 * Updates denormalized vendor_id / assigned_technician_id on ticket.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { TicketAssignResult } from "./types.ts";
import type { AssignTicketInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-ticket-assign";

export async function assignTicket(
  body:          AssignTicketInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<TicketAssignResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Ticket ────────────────────────────────────────────────
  const { data: ticket, error: fetchErr } = await db
    .from("tickets")
    .select("org_id, vendor_id, assigned_technician_id, status, ticket_number")
    .eq("id", body.ticket_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !ticket) throw new NotFoundError("Ticket", correlationId);
  const t = ticket as Record<string, unknown>;

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== t["org_id"]) {
      throw new ForbiddenError("Cannot assign a ticket in a different organization", correlationId);
    }
    // Vendor admins can only assign technicians within their own vendor
    if (claims.vendor_id && body.vendor_id && claims.vendor_id !== body.vendor_id) {
      throw new ForbiddenError("Cannot assign to a different vendor", correlationId);
    }
  }

  // ── 3. Cancel Previous Active Assignment (for reassign) ───────────
  const isReassign = body.action === "reassign";
  const previousVendor = t["vendor_id"] as string | null;
  const previousTech   = t["assigned_technician_id"] as string | null;

  if (isReassign && (previousVendor || previousTech)) {
    await db.from("ticket_assignments")
      .update({ assignment_status: "reassigned", updated_at: now })
      .eq("ticket_id", body.ticket_id)
      .eq("assignment_status", "pending");
  }

  // ── 4. Create New Assignment Record ──────────────────────────────
  const assignmentId = generateUuid();
  const isUnassign   = body.action === "unassign";

  if (!isUnassign) {
    await db.from("ticket_assignments").insert({
      id:                assignmentId,
      ticket_id:         body.ticket_id,
      vendor_id:         body.vendor_id ?? null,
      technician_id:     body.technician_id ?? null,
      assigned_by:       claims.sub,
      assigned_at:       now,
      assignment_status: "pending",
      reason:            body.reason ?? null,
      created_at:        now,
    });
  }

  // ── 5. Update Denormalized Fields on Ticket ───────────────────────
  const ticketPatch: Record<string, unknown> = {
    updated_by: claims.sub,
    updated_at: now,
  };

  if (isUnassign) {
    ticketPatch["vendor_id"]              = null;
    ticketPatch["assigned_technician_id"] = null;
    ticketPatch["status"]                 = "open";
  } else {
    if (body.vendor_id)     ticketPatch["vendor_id"]              = body.vendor_id;
    if (body.technician_id) ticketPatch["assigned_technician_id"] = body.technician_id;
    ticketPatch["status"] = body.technician_id ? "assigned" : "pending_vendor_review";
  }

  await db.from("tickets").update(ticketPatch).eq("id", body.ticket_id);

  // ── 6. Status History ─────────────────────────────────────────────
  await db.from("ticket_status_history").insert({
    id:              generateUuid(),
    ticket_id:       body.ticket_id,
    previous_status: t["status"],
    new_status:      ticketPatch["status"],
    changed_by:      claims.sub,
    reason:          body.reason ?? `Ticket ${body.action}ed`,
    changed_at:      now,
  });

  // ── 7. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      t["org_id"],
    entity_type: "ticket",
    entity_id:   body.ticket_id,
    action:      body.action.toUpperCase(),
    old_value:   { vendor_id: previousVendor, technician_id: previousTech },
    new_value:   { vendor_id: body.vendor_id, technician_id: body.technician_id },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "ticket",
    entity_id:        body.ticket_id,
    activity_type:    isReassign ? "ticket_reassigned" : isUnassign ? "ticket_unassigned" : "ticket_assigned",
    description:      `Ticket ${t["ticket_number"]}: ${body.action} to vendor=${body.vendor_id ?? "N/A"} tech=${body.technician_id ?? "N/A"}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { assignment_id: assignmentId, correlation_id: correlationId },
    occurred_at:      now,
  });

  const eventName = isReassign ? "ticket.reassigned" : "ticket.assigned";
  await publishEvent({
    event_name:      eventName as never,
    payload:         { ticket_id: body.ticket_id, vendor_id: body.vendor_id, technician_id: body.technician_id },
    org_id:          t["org_id"] as string,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, ticket_id: body.ticket_id, action: body.action }, "Ticket assigned");
  return {
    ticket_id:         body.ticket_id,
    assignment_id:     assignmentId,
    action:            body.action,
    vendor_id:         body.vendor_id,
    technician_id:     body.technician_id,
    assignment_status: isUnassign ? "cancelled" : "pending",
    assigned_at:       now,
  };
}
