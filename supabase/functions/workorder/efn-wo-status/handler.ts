/**
 * workorder/efn-wo-status/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Enforces valid lifecycle transitions for a Work Order.
 *
 * Allowed transition matrix:
 *   open        → in_progress, closed (cancelled)
 *   in_progress → completed, open (paused/waiting)
 *   completed   → closed
 *   closed      → (terminal — no transitions)
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { WoStatusResult } from "./types.ts";
import type { WoStatusInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-wo-status";

type WoStatus = "open" | "in_progress" | "completed" | "closed";

const VALID_TRANSITIONS: Record<WoStatus, WoStatus[]> = {
  open:        ["in_progress", "closed"],
  in_progress: ["completed", "open"],
  completed:   ["closed"],
  closed:      [],
};

const EVENT_MAP: Record<WoStatus, string> = {
  open:        "workorder.updated",
  in_progress: "workorder.started",
  completed:   "workorder.completed",
  closed:      "workorder.closed",
};

export async function transitionWoStatus(
  body:          WoStatusInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<WoStatusResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Work Order ────────────────────────────────────────────
  const { data: wo, error: fetchErr } = await db
    .from("work_orders")
    .select("org_id, vendor_id, technician_id, status, work_order_number")
    .eq("id", body.work_order_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !wo) throw new NotFoundError("Work Order", correlationId);
  const w = wo as Record<string, string | null>;
  const currentStatus = w["status"] as WoStatus;

  // ── 2. Transition Validation ──────────────────────────────────────
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(body.new_status as WoStatus)) {
    throw new ValidationError(
      `Invalid transition: ${currentStatus} → ${body.new_status}. Allowed: [${allowed.join(", ")}]`,
      correlationId
    );
  }

  // ── 3. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== w["org_id"]) {
      throw new ForbiddenError("Cannot change status of a work order in a different organization", correlationId);
    }
    if (claims.vendor_id && claims.vendor_id !== w["vendor_id"]) {
      throw new ForbiddenError("Your vendor is not assigned to this work order", correlationId);
    }
    if (claims.app_role === "technician") {
      if (w["technician_id"] !== claims.sub) {
        throw new ForbiddenError("You are not the assigned technician for this work order", correlationId);
      }
      // Technicians may only move to in_progress or completed
      if (!["in_progress", "completed"].includes(body.new_status)) {
        throw new ForbiddenError(`Technicians cannot set status to '${body.new_status}'`, correlationId);
      }
    }
  }

  // ── 4. Build Patch ────────────────────────────────────────────────
  const patch: Record<string, unknown> = {
    status:     body.new_status,
    updated_by: claims.sub,
    updated_at: now,
  };
  if (body.new_status === "completed") patch["completed_at"] = now;

  await db.from("work_orders").update(patch).eq("id", body.work_order_id);

  // ── 5. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      w["org_id"],
    entity_type: "work_order",
    entity_id:   body.work_order_id,
    action:      "STATUS_CHANGE",
    old_value:   { status: currentStatus },
    new_value:   { status: body.new_status, reason: body.reason },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "work_order",
    entity_id:        body.work_order_id,
    activity_type:    "wo_status_changed",
    description:      `WO ${w["work_order_number"]}: status changed ${currentStatus} → ${body.new_status}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { reason: body.reason ?? null, correlation_id: correlationId },
    occurred_at:      now,
  });

  await publishEvent({
    event_name:      EVENT_MAP[body.new_status as WoStatus] as never,
    payload:         { work_order_id: body.work_order_id, previous_status: currentStatus, new_status: body.new_status },
    org_id:          w["org_id"] as string,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, work_order_id: body.work_order_id, currentStatus, newStatus: body.new_status }, "WO status transitioned");
  return {
    work_order_id:   body.work_order_id,
    previous_status: currentStatus,
    new_status:      body.new_status,
    transitioned_at: now,
  };
}
