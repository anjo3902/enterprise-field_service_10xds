/**
 * workorder/efn-wo-time/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles field-service time tracking lifecycle events:
 *   travel_start / travel_end    → syncs travel timestamps on WO
 *   clock_in / work_start        → syncs actual_start_at on WO
 *   clock_out / work_stop        → finalizes labor record (upsert)
 *   break_start / break_end      → recorded as activity_timeline events
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { TimeResult } from "./types.ts";
import type { TimeActionInput } from "./schema.ts";

const FUNCTION_NAME = "efn-wo-time";

const WO_PATCH_MAP: Record<string, Record<string, string>> = {
  travel_start: { travel_started_at: "ts" },
  travel_end:   {},
  clock_in:     { actual_start_at: "ts" },
  work_start:   { actual_start_at: "ts" },
  clock_out:    { actual_end_at: "ts" },
  work_stop:    { actual_end_at: "ts" },
  break_start:  {},
  break_end:    {},
};

const EVENT_MAP: Record<string, string> = {
  travel_start: "workorder.travel.started",
  travel_end:   "workorder.arrived",
  clock_in:     "workorder.started",
  work_start:   "workorder.started",
  clock_out:    "workorder.paused",
  work_stop:    "workorder.paused",
};

export async function handleTime(
  body:          TimeActionInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<TimeResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const ts  = body.timestamp ?? nowUtc();
  const now = nowUtc();

  // ── 1. Load Work Order ────────────────────────────────────────────
  const { data: wo, error: fetchErr } = await db
    .from("work_orders")
    .select("org_id, vendor_id, technician_id")
    .eq("id", body.work_order_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !wo) throw new NotFoundError("Work Order", correlationId);
  const w = wo as Record<string, string | null>;

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== w["org_id"]) {
      throw new ForbiddenError("Cannot track time for a work order in a different organization", correlationId);
    }
    if (claims.vendor_id && claims.vendor_id !== w["vendor_id"]) {
      throw new ForbiddenError("Your vendor is not assigned to this work order", correlationId);
    }
    if (claims.app_role === "technician" && w["technician_id"] !== claims.sub) {
      throw new ForbiddenError("You are not the assigned technician for this work order", correlationId);
    }
  }

  // ── 3. Update Work Order Timestamps ───────────────────────────────
  const woPatchDef = WO_PATCH_MAP[body.action] ?? {};
  const woPatch: Record<string, unknown> = { updated_by: claims.sub, updated_at: now };

  for (const [col, marker] of Object.entries(woPatchDef)) {
    if (marker === "ts") woPatch[col] = ts;
  }

  if (Object.keys(woPatch).length > 2) {
    await db.from("work_orders").update(woPatch).eq("id", body.work_order_id);
  }

  // ── 4. Upsert Labor Record for Clock-out/Work-stop ─────────────────
  let laborId = generateUuid();

  if (body.action === "clock_out" || body.action === "work_stop") {
    const { data: existingLabor } = await db
      .from("work_order_labor")
      .select("id")
      .eq("work_order_id", body.work_order_id)
      .eq("technician_id", body.technician_id)
      .maybeSingle();

    const el = existingLabor as { id: string } | null;
    if (el) laborId = el.id;

    const { error: upsertErr } = await db.from("work_order_labor").upsert({
      id:                laborId,
      work_order_id:     body.work_order_id,
      technician_id:     body.technician_id,
      hours_worked:      body.hours_worked      ?? 0,
      travel_time_hours: body.travel_time_hours ?? 0,
      overtime_hours:    body.overtime_hours    ?? 0,
      labor_cost:        body.labor_cost        ?? null,
      recorded_by:       claims.sub,
      created_at:        now,
    }, { onConflict: "work_order_id,technician_id" });

    if (upsertErr) throw new Error(`Labor upsert failed: ${upsertErr.message}`);
  }

  // ── 5. Activity Timeline ──────────────────────────────────────────
  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "work_order",
    entity_id:        body.work_order_id,
    activity_type:    `wo_${body.action}`,
    description:      `Technician ${body.action.replace(/_/g, " ")} at ${ts}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { technician_id: body.technician_id, timestamp: ts, correlation_id: correlationId },
    occurred_at:      now,
  });

  // ── 6. Audit ──────────────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: w["org_id"],
    entity_type: "work_order", entity_id: body.work_order_id, action: `TIME_${body.action.toUpperCase()}`,
    new_value: { technician_id: body.technician_id, ts },
    ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
  });

  // ── 7. Event ──────────────────────────────────────────────────────
  const eventName = EVENT_MAP[body.action];
  if (eventName) {
    await publishEvent({
      event_name:      eventName as never,
      payload:         { work_order_id: body.work_order_id, technician_id: body.technician_id, ts },
      org_id:          w["org_id"] as string,
      correlation_id:  correlationId,
      source_function: FUNCTION_NAME,
    });
  }

  log.info({ correlationId, work_order_id: body.work_order_id, action: body.action }, "Time event recorded");
  return {
    work_order_id: body.work_order_id,
    labor_id:      laborId,
    action:        body.action,
    recorded_at:   ts,
    hours_worked:  body.hours_worked,
    travel_hours:  body.travel_time_hours,
  };
}
