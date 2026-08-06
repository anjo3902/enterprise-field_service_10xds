/**
 * technician/efn-tech-location/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * High-frequency GPS updates.
 * Updates both `technician_availability` and `technicians` tables.
 * Emits an event (often ignored by standard audit, but sent to Realtime eventually).
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { NotFoundError, ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { UpdateLocationResult } from "./types.ts";
import type { UpdateLocationInput } from "./schema.ts";

const FUNCTION_NAME = "efn-tech-location";

// For GPS updates, we skip writing to audit_logs/activity_timeline
// because it runs too frequently and would flood the DB.

export async function updateLocation(
  body:          UpdateLocationInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<UpdateLocationResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Access Control ─────────────────────────────────────────────
  if (claims.app_role === "technician") {
    const { data: tech } = await db
      .from("technicians")
      .select("user_id")
      .eq("id", body.technician_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!tech || tech.user_id !== claims.sub) {
      throw new ForbiddenError("Cannot update location for a different technician", correlationId);
    }
  } else if (claims.app_role !== "system_admin") {
    // Only tech themselves or system_admin (for testing/simulators) should push GPS
    throw new ForbiddenError("Only the technician can update their GPS location", correlationId);
  }

  const now = nowUtc();

  // ── 2. Update Location ────────────────────────────────────────────
  // Update availability table (live tracking)
  const { error: availErr } = await db
    .from("technician_availability")
    .update({
      current_latitude:        body.latitude,
      current_longitude:       body.longitude,
      last_location_update_at: now,
    })
    .eq("technician_id", body.technician_id);

  if (availErr) throw new Error(`Location update failed: ${availErr.message}`);

  // Update technicians table (tier 1 routing)
  await db
    .from("technicians")
    .update({
      last_latitude:    body.latitude,
      last_longitude:   body.longitude,
      last_location_at: now,
    })
    .eq("id", body.technician_id);

  // ── 3. Publish Event ──────────────────────────────────────────────
  // GPS events might be routed to a firehose or realtime channel instead of pg
  await publishEvent({
    event_name:      "technician.location.updated" as never,
    payload:         { technician_id: body.technician_id, lat: body.latitude, lng: body.longitude },
    vendor_id:       claims.vendor_id ?? null,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  // We don't log every GPS ping to keep logs clean, only trace level if available.
  // log.info() can be too noisy. We'll leave it for now but in prod it might be debug.
  log.info({ correlationId, technician_id: body.technician_id }, "Location updated");
  
  return { technician_id: body.technician_id, updated_at: now };
}
