/**
 * technician/efn-tech-workload/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Retrieves daily workload metrics for a technician.
 * Used for dispatcher workload balancing view.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims }         from "../../shared/auth/types.ts";
import type { GetWorkloadResult } from "./types.ts";
import type { GetWorkloadInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-tech-workload";
const MAX_DAYS = 30; // Max days to query at once

export async function getTechWorkload(
  body:          GetWorkloadInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<GetWorkloadResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Tenant Isolation ───────────────────────────────────────────
  const { data: tech, error: fetchErr } = await db
    .from("technicians")
    .select("user_id, vendor_id")
    .eq("id", body.technician_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !tech) throw new NotFoundError("Technician", correlationId);

  const t = tech as Record<string, string>;

  if (claims.app_role === "technician") {
    if (claims.sub !== t["user_id"]) {
      throw new ForbiddenError("Cannot view workload for a different technician", correlationId);
    }
  } else if (!claims.is_platform_admin && claims.vendor_id !== t["vendor_id"]) {
    // Note: dispatchers belong to vendors in this model, so vendor_id check is sufficient
    throw new ForbiddenError("Cannot view workload for a technician outside your vendor", correlationId);
  }

  // ── 2. Query Workload ─────────────────────────────────────────────
  let query = db
    .from("technician_workload")
    .select("*")
    .eq("technician_id", body.technician_id)
    .order("workload_date", { ascending: false })
    .limit(MAX_DAYS);

  if (body.from_date) query = query.gte("workload_date", body.from_date);
  if (body.to_date)   query = query.lte("workload_date", body.to_date);

  const { data: workloads, error: wlErr } = await query;
  if (wlErr) throw new Error(`Workload fetch failed: ${wlErr.message}`);

  log.info({ correlationId, technician_id: body.technician_id, days: (workloads ?? []).length }, "Workload fetched");

  return {
    technician_id: body.technician_id,
    workload: (workloads ?? []).map((w: Record<string, unknown>) => ({
      workload_date:     w["workload_date"] as string,
      assigned_jobs:     w["assigned_jobs"] as number,
      completed_jobs:    w["completed_jobs"] as number,
      pending_jobs:      w["pending_jobs"] as number,
      travel_hours:      w["travel_hours"] as number,
      work_hours:        w["work_hours"] as number,
      overtime_hours:    w["overtime_hours"] as number,
      capacity_score:    w["capacity_score"] as number | null,
      utilization_score: w["utilization_score"] as number | null,
    })),
  };
}
