/**
 * workorder/efn-wo-update/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Updates a Work Order with full diff tracking.
 * Technicians may only update execution fields (resolution_summary,
 * root_cause, follow_up_*) on their assigned work orders.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { UpdateWorkOrderResult } from "./types.ts";
import type { UpdateWorkOrderInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-wo-update";

/** Fields a technician is allowed to edit */
const TECH_ALLOWED_FIELDS = new Set([
  "resolution_summary", "root_cause", "follow_up_required", "follow_up_notes"
]);

export async function updateWorkOrder(
  body:          UpdateWorkOrderInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<UpdateWorkOrderResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Work Order ────────────────────────────────────────────
  const { data: wo, error: fetchErr } = await db
    .from("work_orders")
    .select("org_id, vendor_id, technician_id, status")
    .eq("id", body.work_order_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !wo) throw new NotFoundError("Work Order", correlationId);
  const w = wo as Record<string, string | null>;

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== w["org_id"]) {
      throw new ForbiddenError("Cannot update a work order in a different organization", correlationId);
    }
    if (claims.vendor_id && claims.vendor_id !== w["vendor_id"]) {
      throw new ForbiddenError("Your vendor is not assigned to this work order", correlationId);
    }
    if (claims.app_role === "technician") {
      // Technicians only update execution fields on their assigned WO
      if (w["technician_id"] !== claims.sub) {
        throw new ForbiddenError("You are not the assigned technician for this work order", correlationId);
      }
      const { work_order_id, reason, ...attempted } = body;
      for (const key of Object.keys(attempted)) {
        if (attempted[key as keyof typeof attempted] !== undefined && !TECH_ALLOWED_FIELDS.has(key)) {
          throw new ForbiddenError(`Technicians cannot update field: ${key}`, correlationId);
        }
      }
    }
  }

  // ── 3. Build Diff Patch ───────────────────────────────────────────
  const { work_order_id, reason, ...fields } = body;
  const patch:       Record<string, unknown> = {};
  const oldValues:   Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const currentVal = w[key];
    if (JSON.stringify(currentVal) !== JSON.stringify(value)) {
      patch[key]     = value;
      oldValues[key] = currentVal;
      changedFields.push(key);
    }
  }

  if (changedFields.length === 0) {
    return { work_order_id, updated_at: w["updated_at"] ?? now, changes: [] };
  }

  if (patch["status"] === "completed") patch["completed_at"] = now;
  patch["updated_by"] = claims.sub;
  patch["updated_at"] = now;

  // ── 4. Apply Update ───────────────────────────────────────────────
  const { error: updateErr } = await db.from("work_orders").update(patch).eq("id", work_order_id);
  if (updateErr) throw new Error(`Work order update failed: ${updateErr.message}`);

  // ── 5. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      w["org_id"],
    entity_type: "work_order",
    entity_id:   work_order_id,
    action:      "UPDATE",
    old_value:   oldValues,
    new_value:   patch,
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "work_order",
    entity_id:        work_order_id,
    activity_type:    "work_order_updated",
    description:      `Work order updated: ${changedFields.join(", ")}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { changed_fields: changedFields, correlation_id: correlationId },
    occurred_at:      now,
  });

  const eventName = changedFields.includes("status") ? "workorder.updated" : "workorder.updated";
  await publishEvent({
    event_name:      eventName as never,
    payload:         { work_order_id, changed_fields: changedFields, old: oldValues, new: patch },
    org_id:          w["org_id"] as string,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, work_order_id, changedFields }, "Work order updated");
  return { work_order_id, updated_at: now, changes: changedFields };
}
