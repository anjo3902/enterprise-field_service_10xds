/**
 * technician/efn-tech-update/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Updates a technician's profile and configuration.
 *
 * Access Rules:
 *   - system_admin & vendor_admin (for their own vendor) can update any field.
 *   - technician can only update their OWN profile (and some fields may be restricted,
 *     but for now we just restrict 'status' so technicians cannot deactivate themselves).
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { NotFoundError, ForbiddenError, ConflictError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { UpdateTechnicianResult } from "./types.ts";
import type { UpdateTechnicianInput } from "./schema.ts";

const FUNCTION_NAME = "efn-tech-update";

const ADMIN_ONLY_FIELDS = new Set(["status", "experience_level", "primary_domain", "working_hours_start", "working_hours_end", "working_days"]);

export async function updateTechnician(
  body:          UpdateTechnicianInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<UpdateTechnicianResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Load Current Technician ────────────────────────────────────
  const { data: current, error: fetchErr } = await db
    .from("technicians")
    .select("*")
    .eq("id", body.technician_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !current) throw new NotFoundError("Technician", correlationId);
  const vendorId = (current as Record<string, string>)["vendor_id"];
  const userId   = (current as Record<string, string>)["user_id"];

  // ── 2. Access Control ─────────────────────────────────────────────
  if (claims.app_role === "technician") {
    // Technicians can only update themselves
    if (claims.sub !== userId) {
      throw new ForbiddenError("Cannot update another technician's profile", correlationId);
    }
    // Check for admin-only fields
    for (const key of Object.keys(body)) {
      if (ADMIN_ONLY_FIELDS.has(key) && body[key as keyof UpdateTechnicianInput] !== undefined) {
        throw new ForbiddenError(`Technicians cannot update field '${key}'`, correlationId);
      }
    }
  } else if (!claims.is_platform_admin && claims.vendor_id !== vendorId) {
    // Vendor admins can only update their own technicians
    throw new ForbiddenError("Cannot update a technician for a different vendor", correlationId);
  }

  // ── 3. Duplicate Email Check ──────────────────────────────────────
  if (body.email && body.email !== (current as Record<string, unknown>)["email"]) {
    const { data: dupe } = await db
      .from("technicians")
      .select("id")
      .eq("email", body.email)
      .eq("vendor_id", vendorId)
      .neq("id", body.technician_id)
      .is("deleted_at", null)
      .maybeSingle();
    
    if (dupe) throw new ConflictError("Email already in use for this vendor", correlationId);
  }

  // ── 4. Build Diff Patch ───────────────────────────────────────────
  const { technician_id, ...fields } = body;
  const patch: Record<string, unknown> = {};
  const oldValues: Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const currentVal = (current as Record<string, unknown>)[key];
    if (JSON.stringify(currentVal) !== JSON.stringify(value)) {
      patch[key]     = value;
      oldValues[key] = currentVal;
      changedFields.push(key);
    }
  }

  if (changedFields.length === 0) {
    return { technician_id, updated_at: (current as Record<string, string>)["updated_at"], changes: [] };
  }

  const now = nowUtc();
  patch["updated_by"] = claims.sub;
  patch["updated_at"] = now;

  // ── 5. Update Technician ──────────────────────────────────────────
  const { error: updateErr } = await db
    .from("technicians")
    .update(patch)
    .eq("id", technician_id);

  if (updateErr) throw new Error(`Technician update failed: ${updateErr.message}`);

  // ── 6. Sync profile email if email changed (only if user_id exists)
  if (patch["email"] && userId) {
    await db.auth.admin.updateUserById(userId, { email: patch["email"] as string });
  }

  // ── 7. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    vendor_id:   vendorId,
    entity_type: "technician",
    entity_id:   technician_id,
    action:      "UPDATE",
    old_value:   oldValues,
    new_value:   patch,
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "vendor",
    entity_id:        vendorId,
    activity_type:    "technician_updated",
    description:      `Technician profile updated: ${changedFields.join(", ")}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { technician_id, changed_fields: changedFields, correlation_id: correlationId },
    occurred_at:      now,
  });

  await publishEvent({
    event_name:      "technician.updated" as never,
    payload:         { technician_id, changed_fields: changedFields },
    vendor_id:       vendorId,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, technician_id, changedFields }, "Technician updated");
  return { technician_id, updated_at: now, changes: changedFields };
}
