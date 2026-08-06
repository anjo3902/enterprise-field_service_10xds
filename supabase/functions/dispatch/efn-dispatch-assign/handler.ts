/**
 * dispatch/efn-dispatch-assign/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Creates a confirmed dispatch_schedule record assigning a technician
 * to a work order.
 *
 * Validation gates:
 *  1. Work order exists and belongs to org
 *  2. Technician exists and belongs to vendor (if vendor scoped)
 *  3. Technician availability status is "available" (unless override)
 *  4. No overlapping dispatch_schedules for this technician in the window
 *  5. Updates technician_availability current_work_order_id
 *  6. Updates work_order technician_id + status → in_progress
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError, ConflictError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { DispatchAssignResult } from "./types.ts";
import type { DispatchAssignInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-dispatch-assign";

export async function dispatchAssign(
  body:          DispatchAssignInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<DispatchAssignResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Work Order ────────────────────────────────────────────
  const { data: wo, error: woErr } = await db
    .from("work_orders")
    .select("org_id, vendor_id, status")
    .eq("id", body.work_order_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (woErr || !wo) throw new NotFoundError("Work Order", correlationId);
  const w = wo as Record<string, string | null>;

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== w["org_id"]) {
      throw new ForbiddenError("Cannot dispatch a work order in a different organization", correlationId);
    }
    if (claims.vendor_id && body.vendor_id && claims.vendor_id !== body.vendor_id) {
      throw new ForbiddenError("Cannot assign technicians from a different vendor", correlationId);
    }
    // Technicians cannot self-assign
    if (claims.app_role === "technician") {
      throw new ForbiddenError("Technicians cannot self-assign. Contact your dispatcher.", correlationId);
    }
  }

  // ── 3. Validate Technician ────────────────────────────────────────
  const { data: tech, error: techErr } = await db
    .from("technicians")
    .select("id, vendor_id, status")
    .eq("id", body.technician_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (techErr || !tech) throw new NotFoundError("Technician", correlationId);
  const t = tech as Record<string, string | null>;

  if (body.vendor_id && t["vendor_id"] !== body.vendor_id) {
    throw new ForbiddenError("Technician does not belong to the specified vendor", correlationId);
  }

  // ── 4. Availability Check ─────────────────────────────────────────
  if (!body.skip_availability_check) {
    const { data: avail } = await db
      .from("technician_availability")
      .select("availability_status")
      .eq("technician_id", body.technician_id)
      .maybeSingle();

    const a = avail as Record<string, string> | null;
    if (a && a["availability_status"] !== "available") {
      throw new ConflictError(
        `Technician is currently '${a["availability_status"]}'. Use skip_availability_check=true for emergency override.`,
        correlationId
      );
    }
  }

  // ── 5. Overlap Detection ──────────────────────────────────────────
  const { data: overlaps, error: overlapErr } = await db
    .from("dispatch_schedules")
    .select("id")
    .eq("technician_id", body.technician_id)
    .is("deleted_at", null)
    .not("dispatch_status", "in", "(cancelled,completed)")
    .lt("scheduled_start_at", body.scheduled_end_at)
    .gt("scheduled_end_at", body.scheduled_start_at);

  if (overlaps && overlaps.length > 0) {
    await publishEvent({
      event_name:      "dispatch.conflict.detected" as never,
      payload:         { technician_id: body.technician_id, work_order_id: body.work_order_id, conflict_count: overlaps.length },
      org_id:          w["org_id"] as string,
      correlation_id:  correlationId,
      source_function: FUNCTION_NAME,
    });
    throw new ConflictError(
      `Schedule conflict: technician already has ${overlaps.length} active dispatch(es) in this window`,
      correlationId
    );
  }

  // ── 6. Create Dispatch Schedule ───────────────────────────────────
  const scheduleId = generateUuid();
  const estimatedArrival = body.estimated_travel_mins
    ? new Date(new Date(body.scheduled_start_at).getTime() + body.estimated_travel_mins * 60000).toISOString()
    : null;

  const { error: insertErr } = await db.from("dispatch_schedules").insert({
    id:                    scheduleId,
    work_order_id:         body.work_order_id,
    technician_id:         body.technician_id,
    vendor_id:             body.vendor_id ?? w["vendor_id"],
    scheduled_start_at:    body.scheduled_start_at,
    scheduled_end_at:      body.scheduled_end_at,
    estimated_travel_mins: body.estimated_travel_mins ?? null,
    estimated_arrival_at:  estimatedArrival,
    route_status:          "pending",
    dispatch_status:       "scheduled",
    created_by:            claims.sub,
    created_at:            now,
  });

  if (insertErr) throw new Error(`Dispatch schedule insert failed: ${insertErr.message}`);

  // ── 7. Immutable Dispatch Event ───────────────────────────────────
  await db.from("dispatch_events").insert({
    id:                  generateUuid(),
    dispatch_schedule_id: scheduleId,
    event_type:          "dispatched",
    event_timestamp:     now,
    triggered_by:        claims.sub,
    remarks:             body.notes ?? null,
  });

  // ── 8. Update Work Order + Availability ───────────────────────────
  await Promise.all([
    db.from("work_orders").update({
      technician_id:  body.technician_id,
      vendor_id:      body.vendor_id ?? w["vendor_id"],
      status:         "in_progress",
      updated_by:     claims.sub,
      updated_at:     now,
    }).eq("id", body.work_order_id),
    db.from("technician_availability").upsert({
      technician_id:         body.technician_id,
      availability_status:   "busy",
      current_work_order_id: body.work_order_id,
      next_available_at:     body.scheduled_end_at,
      updated_at:            now,
    }, { onConflict: "technician_id" }),
  ]);

  // ── 9. Audit ──────────────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: w["org_id"],
    entity_type: "dispatch_schedule", entity_id: scheduleId, action: "CREATE",
    new_value: { technician_id: body.technician_id, scheduled_start_at: body.scheduled_start_at },
    ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
  });

  await db.from("activity_timeline").insert({
    id: generateUuid(), entity_type: "dispatch_schedule", entity_id: scheduleId,
    activity_type: "dispatch_created",
    description: `Technician dispatched to work order from ${body.scheduled_start_at}`,
    performed_by_id: claims.sub, role: claims.app_role,
    metadata: { work_order_id: body.work_order_id, technician_id: body.technician_id, correlation_id: correlationId },
    occurred_at: now,
  });

  await publishEvent({
    event_name:      "dispatch.assigned" as never,
    payload:         { dispatch_schedule_id: scheduleId, work_order_id: body.work_order_id, technician_id: body.technician_id },
    org_id:          w["org_id"] as string,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, scheduleId, technician: body.technician_id }, "Dispatch assignment created");
  return {
    dispatch_schedule_id: scheduleId,
    work_order_id:        body.work_order_id,
    technician_id:        body.technician_id,
    vendor_id:            body.vendor_id,
    scheduled_start_at:   body.scheduled_start_at,
    scheduled_end_at:     body.scheduled_end_at,
    estimated_travel_mins: body.estimated_travel_mins,
    dispatch_status:      "scheduled",
    created_at:           now,
  };
}
