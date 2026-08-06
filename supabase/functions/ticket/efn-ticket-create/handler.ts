/**
 * ticket/efn-ticket-create/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Creates a new Ticket with:
 *  - Sequential ticket number (TKT-YYYY-NNNNN)
 *  - SLA due-date calculation from policy
 *  - Initial status history entry
 *  - Audit log + activity timeline + platform event
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { CreateTicketResult } from "./types.ts";
import type { CreateTicketInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-ticket-create";

/** Generate ticket number: TKT-2026-00001 */
async function generateTicketNumber(db: ReturnType<typeof adminClient>): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `TKT-${year}-`;
  // Count tickets created this year (for sequential numbering)
  const { count } = await db
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .like("ticket_number", `${prefix}%`);
  const seq = String((count ?? 0) + 1).padStart(5, "0");
  return `${prefix}${seq}`;
}

/** Calculate SLA due dates based on policy hours */
function calcSlaDueDates(now: string, responseHours: number, resolutionHours: number) {
  const base = new Date(now);
  const responseDue  = new Date(base.getTime() + responseHours  * 3_600_000).toISOString();
  const resolutionDue = new Date(base.getTime() + resolutionHours * 3_600_000).toISOString();
  return { responseDue, resolutionDue };
}

export async function createTicket(
  body:          CreateTicketInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<CreateTicketResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin && claims.org_id !== body.org_id) {
    throw new ForbiddenError("Cannot create a ticket for a different organization", correlationId);
  }

  // ── 2. Ticket Number ──────────────────────────────────────────────
  const ticketNumber = await generateTicketNumber(db);

  // ── 3. SLA Calculation ────────────────────────────────────────────
  let responseDue: string | null   = null;
  let resolutionDue: string | null = null;

  if (body.sla_policy_id) {
    const { data: slaPolicy } = await db
      .from("sla_policies")
      .select("response_time_hours, resolution_time_hours")
      .eq("id", body.sla_policy_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (slaPolicy) {
      const p = slaPolicy as Record<string, number>;
      const dates = calcSlaDueDates(now, p["response_time_hours"] ?? 4, p["resolution_time_hours"] ?? 24);
      responseDue  = dates.responseDue;
      resolutionDue = dates.resolutionDue;
    }
  }

  // ── 4. Insert Ticket ──────────────────────────────────────────────
  const ticketId = generateUuid();

  const { error: insertErr } = await db.from("tickets").insert({
    id:                    ticketId,
    ticket_number:         ticketNumber,
    org_id:                body.org_id,
    title:                 body.title,
    description:           body.description ?? null,
    priority:              body.priority,
    severity:              body.severity ?? null,
    status:                "open",
    asset_id:              body.asset_id ?? null,
    sla_policy_id:         body.sla_policy_id ?? null,
    service_category_id:   body.service_category_id ?? null,
    service_type_id:       body.service_type_id ?? null,
    site_id:               body.site_id ?? null,
    building_id:           body.building_id ?? null,
    floor_id:              body.floor_id ?? null,
    room_id:               body.room_id ?? null,
    business_unit_id:      body.business_unit_id ?? null,
    department_id:         body.department_id ?? null,
    cost_center_id:        body.cost_center_id ?? null,
    requester_employee_id: body.requester_employee_id ?? null,
    response_sla_status:   body.sla_policy_id ? "ok" : null,
    resolution_sla_status: body.sla_policy_id ? "ok" : null,
    response_due_at:       responseDue,
    resolution_due_at:     resolutionDue,
    created_by:            claims.sub,
    created_at:            now,
  });

  if (insertErr) throw new Error(`Ticket insert failed: ${insertErr.message}`);

  // ── 5. Initial Status History ─────────────────────────────────────
  await db.from("ticket_status_history").insert({
    id:              generateUuid(),
    ticket_id:       ticketId,
    previous_status: null,
    new_status:      "open",
    changed_by:      claims.sub,
    reason:          "Ticket created",
    changed_at:      now,
  });

  // ── 6. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      body.org_id,
    entity_type: "ticket",
    entity_id:   ticketId,
    action:      "CREATE",
    new_value:   { ticket_number: ticketNumber, title: body.title, priority: body.priority },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "ticket",
    entity_id:        ticketId,
    activity_type:    "ticket_created",
    description:      `Ticket ${ticketNumber} created: ${body.title}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { ticket_number: ticketNumber, priority: body.priority, correlation_id: correlationId },
    occurred_at:      now,
  });

  await publishEvent({
    event_name:      "ticket.created" as never,
    payload:         { ticket_id: ticketId, ticket_number: ticketNumber, org_id: body.org_id, priority: body.priority },
    org_id:          body.org_id,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, ticketId, ticketNumber, org_id: body.org_id }, "Ticket created");
  return { ticket_id: ticketId, ticket_number: ticketNumber, org_id: body.org_id, status: "open", priority: body.priority ?? "Medium", created_at: now };
}
