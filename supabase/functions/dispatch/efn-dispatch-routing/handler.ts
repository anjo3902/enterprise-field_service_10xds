/**
 * dispatch/efn-dispatch-routing/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Route calculation and nearest-technician finder.
 *
 * Uses Haversine formula for distance estimation (no external API).
 * When find_nearest=true, scans available technicians with known GPS
 * coordinates and ranks by distance to the destination.
 *
 * ETA calculation: distance / average speed (40 km/h urban default).
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { RoutingResult, NearestTechResult } from "./types.ts";
import type { DispatchRoutingInput } from "./schema.ts";

const FUNCTION_NAME = "efn-dispatch-routing";
const AVG_SPEED_KMH = 40; // Urban average speed assumption

/** Haversine great-circle distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function calculateRouting(
  body:          DispatchRoutingInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
): Promise<RoutingResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Work Order ────────────────────────────────────────────
  const { data: wo } = await db
    .from("work_orders")
    .select("org_id, asset_id, site_id")
    .eq("id", body.work_order_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!wo) throw new NotFoundError("Work Order", correlationId);
  const w = wo as Record<string, string | null>;

  if (!claims.is_platform_admin && claims.org_id && claims.org_id !== w["org_id"]) {
    throw new ForbiddenError("Cannot route for a work order in a different organization", correlationId);
  }

  const destLat = body.destination_lat ?? null;
  const destLng = body.destination_lng ?? null;

  // ── 2. Nearest Technician Mode ────────────────────────────────────
  let nearest: NearestTechResult | undefined;

  if (body.find_nearest && destLat !== null && destLng !== null) {
    let availQuery = db.from("technician_availability")
      .select("technician_id, current_latitude, current_longitude, availability_status")
      .eq("availability_status", "available")
      .not("current_latitude", "is", null);

    if (body.vendor_id) {
      // Filter by vendor through technicians join-equivalent
      const { data: vendorTechs } = await db.from("technicians").select("id").eq("vendor_id", body.vendor_id).is("deleted_at", null);
      const techIds = (vendorTechs ?? []).map((t: Record<string, string>) => t["id"]);
      if (techIds.length > 0) availQuery = availQuery.in("technician_id", techIds);
    }

    const { data: avails } = await availQuery;
    const candidates = (avails ?? []) as Array<Record<string, number | string | null>>;

    let minDist = Infinity;
    for (const cand of candidates) {
      const lat = cand["current_latitude"] as number | null;
      const lng = cand["current_longitude"] as number | null;
      if (lat === null || lng === null) continue;
      const dist = haversineKm(lat, lng, destLat, destLng);
      if (dist < minDist) {
        minDist = dist;
        nearest = {
          technician_id:       cand["technician_id"] as string,
          distance_km:         parseFloat(dist.toFixed(2)),
          estimated_mins:      Math.round((dist / AVG_SPEED_KMH) * 60),
          availability_status: cand["availability_status"] as string,
        };
      }
    }
  }

  // ── 3. ETA Calculation for Specific Technician ────────────────────
  let techLat: number | undefined;
  let techLng: number | undefined;
  let distKm: number | undefined;
  let travelMins = 15; // Default if no GPS data

  const targetTechId = body.technician_id ?? nearest?.technician_id;

  if (targetTechId) {
    const { data: avail } = await db
      .from("technician_availability")
      .select("current_latitude, current_longitude")
      .eq("technician_id", targetTechId)
      .maybeSingle();

    const a = avail as { current_latitude: number | null; current_longitude: number | null } | null;
    if (a?.current_latitude && a?.current_longitude && destLat !== null && destLng !== null) {
      techLat  = a.current_latitude;
      techLng  = a.current_longitude;
      distKm   = haversineKm(techLat, techLng, destLat, destLng);
      travelMins = Math.round((distKm / AVG_SPEED_KMH) * 60);
    }
  }

  const startFrom = body.scheduled_start_at ?? now;
  const estimatedArrival = new Date(new Date(startFrom).getTime() + travelMins * 60000).toISOString();

  // ── 4. Event ──────────────────────────────────────────────────────
  await publishEvent({
    event_name:      "dispatch.route.calculated" as never,
    payload:         { work_order_id: body.work_order_id, technician_id: targetTechId, travel_mins: travelMins, nearest: nearest?.technician_id },
    org_id:          w["org_id"] as string,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, work_order_id: body.work_order_id, travelMins, nearest: nearest?.technician_id }, "Route calculated");
  return {
    work_order_id:          body.work_order_id,
    technician_id:          targetTechId ?? "",
    technician_lat:         techLat,
    technician_lng:         techLng,
    destination_lat:        destLat ?? undefined,
    destination_lng:        destLng ?? undefined,
    estimated_distance_km:  distKm !== undefined ? parseFloat(distKm.toFixed(2)) : undefined,
    estimated_travel_mins:  travelMins,
    estimated_arrival_at:   estimatedArrival,
    nearest_technician:     nearest,
  };
}
