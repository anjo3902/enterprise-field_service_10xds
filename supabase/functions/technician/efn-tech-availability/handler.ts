/**
 * technician/efn-tech-availability/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Updates real-time availability in `technician_availability` and syncs
 * the top-level `availability_state` in the `technicians` table.
 * 
 * This is meant to be called frequently (e.g. clock in, break, clock out).
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { NotFoundError, ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { UpdateAvailabilityResult } from "./types.ts";
import type { UpdateAvailabilityInput } from "./schema.ts";

const FUNCTION_NAME = "efn-tech-availability";

export async function updateAvailability(
  body:          UpdateAvailabilityInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<UpdateAvailabilityResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Access Control ─────────────────────────────────────────────
  const { data: tech, error: fetchErr } = await db
    .from("technicians")
    .select("user_id, vendor_id, availability_state")
    .eq("id", body.technician_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !tech) throw new NotFoundError("Technician", correlationId);

  const t = tech as Record<string, string>;

  if (claims.app_role === "technician") {
    if (claims.sub !== t["user_id"]) {
      throw new ForbiddenError("Cannot update availability for a different technician", correlationId);
    }
  } else if (!claims.is_platform_admin && claims.vendor_id !== t["vendor_id"]) {
    throw new ForbiddenError("Cannot update availability for a technician outside your vendor", correlationId);
  }

  const now = nowUtc();

  // ── 2. Update Availability ────────────────────────────────────────
  const { error: availErr } = await db
    .from("technician_availability")
    .update({
      availability_status: body.status,
      availability_reason: body.reason ?? null,
      updated_at:          now,
    })
    .eq("technician_id", body.technician_id);

  if (availErr) throw new Error(`Availability update failed: ${availErr.message}`);

  // Sync to technicians table for tier-1 dispatch queries
  await db
    .from("technicians")
    .update({ availability_state: body.status, updated_at: now })
    .eq("id", body.technician_id);

  // ── 3. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    vendor_id:   t["vendor_id"],
    entity_type: "technician",
    entity_id:   body.technician_id,
    action:      "STATUS_CHANGE",
    old_value:   { status: t["availability_state"] },
    new_value:   { status: body.status, reason: body.reason },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await publishEvent({
    event_name:      "technician.availability.changed" as never,
    payload:         { technician_id: body.technician_id, new_status: body.status, reason: body.reason },
    vendor_id:       t["vendor_id"],
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, technician_id: body.technician_id, status: body.status }, "Availability updated");
  return { technician_id: body.technician_id, status: body.status, updated_at: now };
}
