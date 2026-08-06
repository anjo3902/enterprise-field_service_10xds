/**
 * ticket/efn-ticket-update/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Updates a ticket with full diff tracking and status history.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { UpdateTicketResult } from "./types.ts";
import type { UpdateTicketInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-ticket-update";

// Fields vendors/technicians can update on assigned tickets
const VENDOR_ALLOWED_FIELDS = new Set([
  "status", "resolution_summary", "root_cause", "severity"
]);

export async function updateTicket(
  body:          UpdateTicketInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<UpdateTicketResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Current Ticket ────────────────────────────────────────
  const { data: current, error: fetchErr } = await db
    .from("tickets")
    .select("*")
    .eq("id", body.ticket_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !current) throw new NotFoundError("Ticket", correlationId);
  const c = current as Record<string, unknown>;

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id) {
      if (claims.org_id !== c["org_id"]) {
        throw new ForbiddenError("Cannot update a ticket in a different organization", correlationId);
      }
    } else if (claims.vendor_id) {
      // Vendors may only update assigned tickets
      if (c["vendor_id"] !== claims.vendor_id) {
        throw new ForbiddenError("Your vendor is not assigned to this ticket", correlationId);
      }
      // Restrict which fields vendors can change
      const { ticket_id, reason, ...fieldsAttempted } = body;
      for (const key of Object.keys(fieldsAttempted)) {
        if (fieldsAttempted[key as keyof typeof fieldsAttempted] !== undefined && !VENDOR_ALLOWED_FIELDS.has(key)) {
          throw new ForbiddenError(`Vendors cannot update field: ${key}`, correlationId);
        }
      }
    } else if (claims.app_role === "technician") {
      // Technicians can only update status on assigned tickets
      if (c["assigned_technician_id"] !== claims.sub) {
        throw new ForbiddenError("You are not the assigned technician for this ticket", correlationId);
      }
    }
  }

  // ── 3. Build Diff Patch ───────────────────────────────────────────
  const { ticket_id, reason, ...fields } = body;
  const patch: Record<string, unknown> = {};
  const oldValues: Record<string, unknown> = {};
  const changedFields: string[] = [];
  let statusChanged = false;

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const currentVal = c[key];
    if (JSON.stringify(currentVal) !== JSON.stringify(value)) {
      patch[key]     = value;
      oldValues[key] = currentVal;
      changedFields.push(key);
      if (key === "status") statusChanged = true;
    }
  }

  if (changedFields.length === 0) {
    return { ticket_id, updated_at: c["updated_at"] as string ?? now, changes: [], status_changed: false };
  }

  // Handle closed/completed timestamps
  if (patch["status"] === "completed") patch["completed_at"] = now;
  if (patch["status"] === "closed")    patch["closed_at"]    = now;

  patch["updated_by"] = claims.sub;
  patch["updated_at"] = now;

  // ── 4. Update Ticket ──────────────────────────────────────────────
  const { error: updateErr } = await db
    .from("tickets")
    .update(patch)
    .eq("id", ticket_id);

  if (updateErr) throw new Error(`Ticket update failed: ${updateErr.message}`);

  // ── 5. Status History ─────────────────────────────────────────────
  if (statusChanged) {
    await db.from("ticket_status_history").insert({
      id:              generateUuid(),
      ticket_id,
      previous_status: c["status"],
      new_status:      patch["status"],
      changed_by:      claims.sub,
      reason:          reason ?? null,
      changed_at:      now,
    });
  }

  // ── 6. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      c["org_id"],
    entity_type: "ticket",
    entity_id:   ticket_id,
    action:      "UPDATE",
    old_value:   oldValues,
    new_value:   patch,
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "ticket",
    entity_id:        ticket_id,
    activity_type:    statusChanged ? "status_changed" : "ticket_updated",
    description:      statusChanged
      ? `Status changed from ${c["status"]} to ${patch["status"]}`
      : `Ticket updated: ${changedFields.join(", ")}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { changed_fields: changedFields, correlation_id: correlationId },
    occurred_at:      now,
  });

  // Determine event type
  const eventName = statusChanged
    ? (patch["status"] === "closed" ? "ticket.closed" :
       patch["status"] === "escalated" ? "ticket.escalated" :
       "ticket.status.changed")
    : (changedFields.includes("priority") ? "ticket.priority.changed" : "ticket.updated");

  await publishEvent({
    event_name:      eventName as never,
    payload:         { ticket_id, changed_fields: changedFields, old: oldValues, new: patch },
    org_id:          c["org_id"] as string,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, ticket_id, changedFields }, "Ticket updated");
  return { ticket_id, updated_at: now, changes: changedFields, status_changed: statusChanged };
}
