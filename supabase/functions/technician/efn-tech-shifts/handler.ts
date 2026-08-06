/**
 * technician/efn-tech-shifts/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * CRUD for recurring technician shifts.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims }      from "../../shared/auth/types.ts";
import type { ShiftResult }    from "./types.ts";
import type { ShiftActionInput } from "./schema.ts";

const FUNCTION_NAME = "efn-tech-shifts";

export async function handleTechShift(
  body:          ShiftActionInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<ShiftResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Tenant Isolation ───────────────────────────────────────────
  const { data: tech, error: fetchErr } = await db
    .from("technicians")
    .select("vendor_id")
    .eq("id", body.technician_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !tech) throw new NotFoundError("Technician", correlationId);

  const vendorId = (tech as Record<string, string>)["vendor_id"];

  if (!claims.is_platform_admin && claims.vendor_id !== vendorId) {
    throw new ForbiddenError("Cannot manage shifts for a different vendor's technician", correlationId);
  }

  let resultRecordId = body.action === "create" ? generateUuid() : body.shift_id!;
  const auditPatch: Record<string, unknown> = {};

  // ── 2. Dispatch by Action ─────────────────────────────────────────
  if (body.action === "create") {
    const { error: insertErr } = await db
      .from("technician_shifts")
      .insert({
        id:                  resultRecordId,
        technician_id:       body.technician_id,
        shift_name:          body.shift_name,
        start_time:          body.start_time,
        end_time:            body.end_time,
        break_duration_mins: body.break_duration_mins,
        working_days:        body.working_days,
        timezone:            body.timezone,
        created_by:          claims.sub,
        created_at:          now,
      });

    if (insertErr) throw new Error(`Shift create failed: ${insertErr.message}`);
    auditPatch["action"]    = "CREATE";
    auditPatch["new_value"] = { name: body.shift_name, start: body.start_time, end: body.end_time };
  } else if (body.action === "update") {
    const { error: updateErr } = await db
      .from("technician_shifts")
      .update({
        shift_name:          body.shift_name,
        start_time:          body.start_time,
        end_time:            body.end_time,
        break_duration_mins: body.break_duration_mins,
        working_days:        body.working_days,
        timezone:            body.timezone,
        updated_by:          claims.sub,
        updated_at:          now,
      })
      .eq("id", body.shift_id)
      .eq("technician_id", body.technician_id);

    if (updateErr) throw new Error(`Shift update failed: ${updateErr.message}`);
    auditPatch["action"]    = "UPDATE";
    auditPatch["new_value"] = { name: body.shift_name, start: body.start_time, end: body.end_time };
  } else if (body.action === "remove") {
    const { error: rmErr } = await db
      .from("technician_shifts")
      .update({ deleted_at: now, updated_by: claims.sub, updated_at: now })
      .eq("id", body.shift_id)
      .eq("technician_id", body.technician_id);

    if (rmErr) throw new Error(`Shift remove failed: ${rmErr.message}`);
    auditPatch["action"]    = "DELETE";
    auditPatch["old_value"] = { shift_id: body.shift_id };
  }

  // ── 3. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    vendor_id:   vendorId,
    entity_type: "technician_shift",
    entity_id:   resultRecordId,
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
    ...auditPatch,
  });

  await publishEvent({
    event_name:      body.action === "create" ? ("technician.shift.assigned" as never) : ("technician.shift.updated" as never),
    payload:         { technician_id: body.technician_id, shift_id: resultRecordId, action: body.action },
    vendor_id:       vendorId,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, technician_id: body.technician_id, shift_id: resultRecordId, action: body.action }, "Shift managed");
  return { technician_id: body.technician_id, shift_id: resultRecordId, action: body.action };
}
