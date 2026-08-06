/**
 * dispatch/efn-dispatch-reassign/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Reassigns a dispatch_schedule to a new technician.
 *  1. Loads and validates existing schedule
 *  2. Cancels old schedule (dispatch_status = cancelled)
 *  3. Records cancellation event in dispatch_events
 *  4. Frees old technician availability
 *  5. Creates new dispatch_schedule
 *  6. Updates work_order + new technician availability
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError, ConflictError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { DispatchReassignResult } from "./types.ts";
import type { DispatchReassignInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-dispatch-reassign";

export async function dispatchReassign(
  body:          DispatchReassignInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<DispatchReassignResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Existing Schedule ─────────────────────────────────────
  const { data: schedule, error: sErr } = await db
    .from("dispatch_schedules")
    .select("work_order_id, technician_id, vendor_id, scheduled_start_at, scheduled_end_at, dispatch_status")
    .eq("id", body.dispatch_schedule_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (sErr || !schedule) throw new NotFoundError("Dispatch Schedule", correlationId);
  const s = schedule as Record<string, string | null>;

  if (s["dispatch_status"] === "cancelled" || s["dispatch_status"] === "completed") {
    throw new ConflictError(`Cannot reassign a ${s["dispatch_status"]} dispatch schedule`, correlationId);
  }

  // ── 2. Load Work Order Org ────────────────────────────────────────
  const { data: wo } = await db.from("work_orders").select("org_id").eq("id", s["work_order_id"]).maybeSingle();
  const wOrgId = (wo as Record<string, string>)?.["org_id"] ?? "";

  // ── 3. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== wOrgId) {
      throw new ForbiddenError("Cannot reassign dispatch in a different organization", correlationId);
    }
    if (claims.app_role === "technician") {
      throw new ForbiddenError("Technicians cannot reassign dispatches", correlationId);
    }
  }

  // ── 4. Overlap Check for New Technician ───────────────────────────
  const newStart = body.new_scheduled_start_at ?? s["scheduled_start_at"]!;
  const newEnd   = body.new_scheduled_end_at   ?? s["scheduled_end_at"]!;

  const { data: conflicts } = await db
    .from("dispatch_schedules")
    .select("id")
    .eq("technician_id", body.new_technician_id)
    .is("deleted_at", null)
    .not("dispatch_status", "in", "(cancelled,completed)")
    .lt("scheduled_start_at", newEnd)
    .gt("scheduled_end_at", newStart);

  if (conflicts && conflicts.length > 0) {
    throw new ConflictError(`New technician has ${conflicts.length} scheduling conflict(s) in this window`, correlationId);
  }

  // ── 5. Cancel Old Schedule ────────────────────────────────────────
  await db.from("dispatch_schedules").update({
    dispatch_status: "cancelled",
    updated_by:      claims.sub,
    updated_at:      now,
  }).eq("id", body.dispatch_schedule_id);

  await db.from("dispatch_events").insert({
    id: generateUuid(), dispatch_schedule_id: body.dispatch_schedule_id,
    event_type: "cancelled", event_timestamp: now,
    triggered_by: claims.sub, remarks: `Reassigned. Reason: ${body.reason}`,
  });

  // Free old technician
  await db.from("technician_availability").update({
    availability_status:   "available",
    current_work_order_id: null,
    next_available_at:     null,
    updated_at:            now,
  }).eq("technician_id", s["technician_id"]);

  // ── 6. Create New Schedule ────────────────────────────────────────
  const newScheduleId = generateUuid();
  await db.from("dispatch_schedules").insert({
    id:                  newScheduleId,
    work_order_id:       s["work_order_id"],
    technician_id:       body.new_technician_id,
    vendor_id:           body.new_vendor_id ?? s["vendor_id"],
    scheduled_start_at:  newStart,
    scheduled_end_at:    newEnd,
    route_status:        "pending",
    dispatch_status:     "scheduled",
    created_by:          claims.sub,
    created_at:          now,
  });

  await db.from("dispatch_events").insert({
    id: generateUuid(), dispatch_schedule_id: newScheduleId,
    event_type: "dispatched", event_timestamp: now,
    triggered_by: claims.sub, remarks: `Reassigned from tech ${s["technician_id"]}: ${body.reason}`,
  });

  // ── 7. Update WO + New Technician Availability ────────────────────
  await Promise.all([
    db.from("work_orders").update({
      technician_id: body.new_technician_id,
      vendor_id:     body.new_vendor_id ?? s["vendor_id"],
      updated_by:    claims.sub, updated_at: now,
    }).eq("id", s["work_order_id"]),
    db.from("technician_availability").upsert({
      technician_id:         body.new_technician_id,
      availability_status:   "busy",
      current_work_order_id: s["work_order_id"],
      next_available_at:     newEnd,
      updated_at:            now,
    }, { onConflict: "technician_id" }),
  ]);

  // ── 8. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: wOrgId,
    entity_type: "dispatch_schedule", entity_id: newScheduleId, action: "REASSIGN",
    old_value: { schedule_id: body.dispatch_schedule_id, technician_id: s["technician_id"] },
    new_value: { schedule_id: newScheduleId, technician_id: body.new_technician_id, reason: body.reason },
    ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
  });

  await publishEvent({
    event_name:      "dispatch.reassigned" as never,
    payload:         { old_schedule_id: body.dispatch_schedule_id, new_schedule_id: newScheduleId, new_technician_id: body.new_technician_id },
    org_id:          wOrgId,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, newScheduleId, newTech: body.new_technician_id }, "Dispatch reassigned");
  return {
    old_schedule_id:   body.dispatch_schedule_id,
    new_schedule_id:   newScheduleId,
    work_order_id:     s["work_order_id"]!,
    new_technician_id: body.new_technician_id,
    reason:            body.reason,
    reassigned_at:     now,
  };
}
