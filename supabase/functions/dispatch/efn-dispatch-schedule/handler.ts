/**
 * dispatch/efn-dispatch-schedule/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Manages schedule lifecycle: create, update, cancel.
 * Business-hour and holiday validation on create.
 * Conflict detection on create and update.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError, ConflictError, ValidationError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { ScheduleResult } from "./types.ts";
import type { DispatchScheduleInput } from "./schema.ts";

const FUNCTION_NAME = "efn-dispatch-schedule";

// Day-name abbreviation used in business_hours.working_days (TEXT array)
const ISO_TO_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

async function assertBusinessHours(
  db: ReturnType<typeof adminClient>,
  orgId: string,
  start: string,
  correlationId: string,
): Promise<void> {
  const { data: bh } = await db
    .from("business_hours")
    .select("working_days, start_time, end_time")
    .eq("org_id", orgId)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!bh) return; // No policy = unrestricted

  const b = bh as { working_days: string[]; start_time: string; end_time: string };
  const dt = new Date(start);
  const dayName = ISO_TO_DAY[dt.getUTCDay()];
  const timeStr = dt.toISOString().slice(11, 16); // HH:MM

  if (!b.working_days.includes(dayName)) {
    throw new ValidationError(`Scheduling on ${dayName} is outside business working days`, correlationId);
  }
  if (timeStr < b.start_time.slice(0, 5) || timeStr > b.end_time.slice(0, 5)) {
    throw new ValidationError(`Scheduled time ${timeStr} is outside business hours (${b.start_time}–${b.end_time})`, correlationId);
  }
}

async function assertNotHoliday(
  db: ReturnType<typeof adminClient>,
  orgId: string,
  start: string,
  correlationId: string,
): Promise<void> {
  const date = start.slice(0, 10); // YYYY-MM-DD
  const { data: holiday } = await db
    .from("holiday_calendar")
    .select("holiday_name")
    .eq("org_id", orgId)
    .eq("holiday_date", date)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (holiday) {
    const h = holiday as { holiday_name: string };
    throw new ValidationError(`Cannot schedule on a holiday: '${h.holiday_name}' (${date})`, correlationId);
  }
}

export async function handleSchedule(
  body:          DispatchScheduleInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<ScheduleResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  if (body.action === "create") {
    // Load WO for org context
    const { data: wo } = await db.from("work_orders").select("org_id").eq("id", body.work_order_id).is("deleted_at", null).maybeSingle();
    if (!wo) throw new NotFoundError("Work Order", correlationId);
    const orgId = (wo as Record<string, string>)["org_id"];

    if (!claims.is_platform_admin && claims.org_id && claims.org_id !== orgId) {
      throw new ForbiddenError("Cannot schedule work orders in a different organization", correlationId);
    }

    // Business hours + holiday gate
    if (body.check_business_hours) await assertBusinessHours(db, orgId, body.scheduled_start_at, correlationId);
    if (body.check_holidays)       await assertNotHoliday(db, orgId, body.scheduled_start_at, correlationId);

    // Overlap check
    const { data: conflicts } = await db
      .from("dispatch_schedules").select("id")
      .eq("technician_id", body.technician_id).is("deleted_at", null)
      .not("dispatch_status", "in", "(cancelled,completed)")
      .lt("scheduled_start_at", body.scheduled_end_at).gt("scheduled_end_at", body.scheduled_start_at);

    const conflictDetected = (conflicts ?? []).length > 0;
    if (conflictDetected) {
      await publishEvent({ event_name: "dispatch.conflict.detected" as never, payload: { technician_id: body.technician_id }, org_id: orgId, correlation_id: correlationId, source_function: FUNCTION_NAME });
      throw new ConflictError(`Schedule conflict: ${conflicts!.length} overlapping dispatch(es) found`, correlationId);
    }

    const schedId = generateUuid();
    const estArrival = body.estimated_travel_mins
      ? new Date(new Date(body.scheduled_start_at).getTime() + body.estimated_travel_mins * 60000).toISOString()
      : null;

    await db.from("dispatch_schedules").insert({
      id: schedId, work_order_id: body.work_order_id, technician_id: body.technician_id,
      vendor_id: body.vendor_id ?? null, scheduled_start_at: body.scheduled_start_at,
      scheduled_end_at: body.scheduled_end_at, estimated_travel_mins: body.estimated_travel_mins ?? null,
      estimated_arrival_at: estArrival, route_status: "pending", dispatch_status: "scheduled",
      created_by: claims.sub, created_at: now,
    });

    await db.from("dispatch_events").insert({ id: generateUuid(), dispatch_schedule_id: schedId, event_type: "scheduled", event_timestamp: now, triggered_by: claims.sub });

    await db.from("audit_logs").insert({ id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: orgId, entity_type: "dispatch_schedule", entity_id: schedId, action: "SCHEDULE_CREATE", new_value: { scheduled_start_at: body.scheduled_start_at, technician_id: body.technician_id }, ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now });

    await publishEvent({ event_name: "dispatch.schedule.created" as never, payload: { schedule_id: schedId, work_order_id: body.work_order_id, technician_id: body.technician_id }, org_id: orgId, correlation_id: correlationId, source_function: FUNCTION_NAME });

    log.info({ correlationId, schedId }, "Dispatch schedule created");
    return { action: "create", schedule_id: schedId, work_order_id: body.work_order_id, technician_id: body.technician_id, scheduled_start_at: body.scheduled_start_at, scheduled_end_at: body.scheduled_end_at, conflict_detected: false, dispatch_status: "scheduled" };

  } else if (body.action === "update") {
    const { data: existing, error: eErr } = await db.from("dispatch_schedules").select("*").eq("id", body.schedule_id).is("deleted_at", null).maybeSingle();
    if (eErr || !existing) throw new NotFoundError("Dispatch Schedule", correlationId);
    const e = existing as Record<string, string | null>;

    if (!claims.is_platform_admin && claims.app_role === "technician") throw new ForbiddenError("Technicians cannot reschedule dispatches", correlationId);

    const newStart = body.scheduled_start_at ?? e["scheduled_start_at"]!;
    const newEnd   = body.scheduled_end_at   ?? e["scheduled_end_at"]!;

    const patch: Record<string, unknown> = { updated_by: claims.sub, updated_at: now };
    if (body.scheduled_start_at)    patch["scheduled_start_at"]    = body.scheduled_start_at;
    if (body.scheduled_end_at)      patch["scheduled_end_at"]      = body.scheduled_end_at;
    if (body.estimated_travel_mins !== undefined) patch["estimated_travel_mins"] = body.estimated_travel_mins;

    await db.from("dispatch_schedules").update(patch).eq("id", body.schedule_id);
    await db.from("dispatch_events").insert({ id: generateUuid(), dispatch_schedule_id: body.schedule_id, event_type: "rescheduled", event_timestamp: now, triggered_by: claims.sub, remarks: body.notes ?? null });

    await publishEvent({ event_name: "dispatch.schedule.updated" as never, payload: { schedule_id: body.schedule_id, new_start: newStart }, org_id: "", correlation_id: correlationId, source_function: FUNCTION_NAME });

    log.info({ correlationId, schedId: body.schedule_id }, "Dispatch schedule updated");
    return { action: "update", schedule_id: body.schedule_id, work_order_id: e["work_order_id"]!, technician_id: e["technician_id"]!, scheduled_start_at: newStart, scheduled_end_at: newEnd, conflict_detected: false, dispatch_status: e["dispatch_status"]! };

  } else {
    // cancel
    const { data: existing } = await db.from("dispatch_schedules").select("work_order_id, technician_id, scheduled_start_at, scheduled_end_at").eq("id", body.schedule_id).maybeSingle();
    if (!existing) throw new NotFoundError("Dispatch Schedule", correlationId);
    const e = existing as Record<string, string>;

    await db.from("dispatch_schedules").update({ dispatch_status: "cancelled", updated_by: claims.sub, updated_at: now }).eq("id", body.schedule_id);
    await db.from("dispatch_events").insert({ id: generateUuid(), dispatch_schedule_id: body.schedule_id, event_type: "cancelled", event_timestamp: now, triggered_by: claims.sub, remarks: body.reason });
    await db.from("technician_availability").update({ availability_status: "available", current_work_order_id: null, next_available_at: null, updated_at: now }).eq("technician_id", e["technician_id"]);

    log.info({ correlationId, schedId: body.schedule_id }, "Dispatch schedule cancelled");
    return { action: "cancel", schedule_id: body.schedule_id, work_order_id: e["work_order_id"], technician_id: e["technician_id"], scheduled_start_at: e["scheduled_start_at"], scheduled_end_at: e["scheduled_end_at"], conflict_detected: false, dispatch_status: "cancelled" };
  }
}
