/**
 * workorder/efn-wo-create/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Creates a Work Order from an existing Ticket.
 *  - Generates WO-YYYY-NNNNN sequential number
 *  - Validates ticket belongs to org
 *  - Inherits asset, site from ticket if not overridden
 *  - Updates ticket status to work_order_generated
 *  - Initializes audit trail
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { CreateWorkOrderResult } from "./types.ts";
import type { CreateWorkOrderInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-wo-create";

async function generateWorkOrderNumber(db: ReturnType<typeof adminClient>): Promise<string> {
  const year   = new Date().getUTCFullYear();
  const prefix = `WO-${year}-`;
  const { count } = await db
    .from("work_orders")
    .select("*", { count: "exact", head: true })
    .like("work_order_number", `${prefix}%`);
  const seq = String((count ?? 0) + 1).padStart(5, "0");
  return `${prefix}${seq}`;
}

export async function createWorkOrder(
  body:          CreateWorkOrderInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<CreateWorkOrderResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin && claims.org_id !== body.org_id) {
    throw new ForbiddenError("Cannot create work order for a different organization", correlationId);
  }

  // ── 2. Validate Ticket ────────────────────────────────────────────
  const { data: ticket, error: tErr } = await db
    .from("tickets")
    .select("org_id, asset_id, site_id, building_id, floor_id, room_id, vendor_id, status")
    .eq("id", body.ticket_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (tErr || !ticket) throw new NotFoundError("Ticket", correlationId);
  const t = ticket as Record<string, string | null>;

  if (t["org_id"] !== body.org_id) {
    throw new ForbiddenError("Ticket does not belong to the specified organization", correlationId);
  }

  // ── 3. Generate Work Order Number ──────────────────────────────────
  const woNumber = await generateWorkOrderNumber(db);
  const woId     = generateUuid();

  // ── 4. Insert Work Order (inherit from ticket if not overridden) ───
  const { error: insertErr } = await db.from("work_orders").insert({
    id:                      woId,
    work_order_number:       woNumber,
    ticket_id:               body.ticket_id,
    org_id:                  body.org_id,
    vendor_id:               body.vendor_id    ?? t["vendor_id"],
    technician_id:           body.technician_id ?? null,
    asset_id:                body.asset_id      ?? t["asset_id"],
    site_id:                 body.site_id       ?? t["site_id"],
    building_id:             body.building_id   ?? t["building_id"],
    floor_id:                body.floor_id      ?? t["floor_id"],
    room_id:                 body.room_id       ?? t["room_id"],
    service_category_id:     body.service_category_id ?? null,
    service_type_id:         body.service_type_id     ?? null,
    priority:                body.priority,
    status:                  "open",
    scheduled_start_at:      body.scheduled_start_at ?? null,
    scheduled_end_at:        body.scheduled_end_at   ?? null,
    estimated_duration_mins: body.estimated_duration_mins ?? null,
    created_by:              claims.sub,
    created_at:              now,
  });

  if (insertErr) throw new Error(`Work order insert failed: ${insertErr.message}`);

  // ── 5. Update Ticket Status ────────────────────────────────────────
  await db.from("tickets").update({
    status:     "work_order_generated",
    updated_by: claims.sub,
    updated_at: now,
  }).eq("id", body.ticket_id);

  await db.from("ticket_status_history").insert({
    id:              generateUuid(),
    ticket_id:       body.ticket_id,
    previous_status: t["status"],
    new_status:      "work_order_generated",
    changed_by:      claims.sub,
    reason:          `Work order ${woNumber} created`,
    changed_at:      now,
  });

  // ── 6. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      body.org_id,
    entity_type: "work_order",
    entity_id:   woId,
    action:      "CREATE",
    new_value:   { work_order_number: woNumber, ticket_id: body.ticket_id, priority: body.priority },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "work_order",
    entity_id:        woId,
    activity_type:    "work_order_created",
    description:      `Work order ${woNumber} created from ticket`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { wo_number: woNumber, ticket_id: body.ticket_id, correlation_id: correlationId },
    occurred_at:      now,
  });

  await publishEvent({
    event_name:      "workorder.created" as never,
    payload:         { work_order_id: woId, work_order_number: woNumber, ticket_id: body.ticket_id, org_id: body.org_id },
    org_id:          body.org_id,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, woId, woNumber }, "Work order created");
  return { work_order_id: woId, work_order_number: woNumber, ticket_id: body.ticket_id, org_id: body.org_id, status: "open", created_at: now };
}
