/**
 * workorder/efn-wo-assignment/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Assigns or reassigns technician/vendor to a work order.
 * Records an activity_timeline entry for every assignment change.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { WoAssignmentResult } from "./types.ts";
import type { WoAssignmentInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-wo-assignment";

export async function assignWorkOrder(
  body:          WoAssignmentInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<WoAssignmentResult> {
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

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== w["org_id"]) {
      throw new ForbiddenError("Cannot assign a work order in a different organization", correlationId);
    }
    if (claims.vendor_id) {
      if (w["vendor_id"] !== claims.vendor_id) {
        throw new ForbiddenError("Your vendor is not assigned to this work order", correlationId);
      }
      // Vendors can only assign technicians — not change vendor
      if (body.vendor_id && body.vendor_id !== claims.vendor_id) {
        throw new ForbiddenError("Cannot reassign to a different vendor", correlationId);
      }
    }
  }

  const prevVendor = w["vendor_id"];
  const prevTech   = w["technician_id"];

  // ── 3. Build Patch ────────────────────────────────────────────────
  const patch: Record<string, unknown> = { updated_by: claims.sub, updated_at: now };

  if (body.action === "unassign") {
    patch["technician_id"] = null;
    patch["vendor_id"]     = null;
    patch["status"]        = "open";
  } else {
    if (body.vendor_id)     patch["vendor_id"]     = body.vendor_id;
    if (body.technician_id) patch["technician_id"] = body.technician_id;
    patch["status"] = body.technician_id ? "in_progress" : "open";
  }

  // ── 4. Update Work Order ──────────────────────────────────────────
  const { error: updateErr } = await db.from("work_orders").update(patch).eq("id", body.work_order_id);
  if (updateErr) throw new Error(`Assignment update failed: ${updateErr.message}`);

  // ── 5. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      w["org_id"],
    entity_type: "work_order",
    entity_id:   body.work_order_id,
    action:      body.action.toUpperCase(),
    old_value:   { vendor_id: prevVendor, technician_id: prevTech },
    new_value:   { vendor_id: body.vendor_id, technician_id: body.technician_id },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "work_order",
    entity_id:        body.work_order_id,
    activity_type:    body.action === "reassign" ? "wo_reassigned" : body.action === "unassign" ? "wo_unassigned" : "wo_assigned",
    description:      `Work order ${w["work_order_number"]}: ${body.action} → tech=${body.technician_id ?? "N/A"} vendor=${body.vendor_id ?? "N/A"}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { reason: body.reason ?? null, correlation_id: correlationId },
    occurred_at:      now,
  });

  const eventName = body.action === "reassign" ? "workorder.reassigned" : "workorder.assigned";
  await publishEvent({
    event_name:      eventName as never,
    payload:         { work_order_id: body.work_order_id, technician_id: body.technician_id, vendor_id: body.vendor_id },
    org_id:          w["org_id"] as string,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, work_order_id: body.work_order_id, action: body.action }, "WO assignment complete");
  return {
    work_order_id: body.work_order_id,
    action:        body.action,
    vendor_id:     body.vendor_id,
    technician_id: body.technician_id,
    assigned_at:   now,
  };
}
