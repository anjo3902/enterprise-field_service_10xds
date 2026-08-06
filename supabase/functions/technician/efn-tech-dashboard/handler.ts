/**
 * technician/efn-tech-dashboard/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Retrieves the technician dashboard summary:
 * - Live availability
 * - Denormalized performance metrics
 * - Today's workload snapshot
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims }           from "../../shared/auth/types.ts";
import type { TechDashboardResult } from "./types.ts";
import type { TechDashboardInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-tech-dashboard";

export async function getTechDashboard(
  body:          TechDashboardInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<TechDashboardResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Load Technician (with metrics) ─────────────────────────────
  const { data: tech, error: fetchErr } = await db
    .from("technicians")
    .select("user_id, vendor_id, jobs_completed, avg_resolution_hours, customer_rating, sla_compliance, first_time_fix_rate")
    .eq("id", body.technician_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !tech) throw new NotFoundError("Technician", correlationId);

  const t = tech as Record<string, unknown>;

  // ── 2. Access Control ─────────────────────────────────────────────
  if (claims.app_role === "technician") {
    if (claims.sub !== (t["user_id"] as string)) {
      throw new ForbiddenError("Cannot view dashboard for a different technician", correlationId);
    }
  } else if (!claims.is_platform_admin && claims.vendor_id !== (t["vendor_id"] as string)) {
    throw new ForbiddenError("Cannot view dashboard for a technician outside your vendor", correlationId);
  }

  // ── 3. Load Availability ──────────────────────────────────────────
  const { data: avail } = await db
    .from("technician_availability")
    .select("availability_status, availability_reason, current_work_order_id")
    .eq("technician_id", body.technician_id)
    .maybeSingle();

  const a = (avail as Record<string, string | null>) ?? {
    availability_status: "offline",
    availability_reason: null,
    current_work_order_id: null,
  };

  // ── 4. Load Today's Workload ──────────────────────────────────────
  const today = nowUtc().substring(0, 10);
  const { data: workload } = await db
    .from("technician_workload")
    .select("assigned_jobs, completed_jobs, pending_jobs, travel_hours, work_hours")
    .eq("technician_id", body.technician_id)
    .eq("workload_date", today)
    .maybeSingle();

  const w = (workload as Record<string, number>) ?? {
    assigned_jobs: 0,
    completed_jobs: 0,
    pending_jobs: 0,
    travel_hours: 0,
    work_hours: 0,
  };

  log.info({ correlationId, technician_id: body.technician_id }, "Technician dashboard fetched");

  return {
    technician_id: body.technician_id,
    availability: {
      status:             a["availability_status"] ?? "offline",
      reason:             a["availability_reason"],
      current_work_order: a["current_work_order_id"],
    },
    metrics: {
      jobs_completed:       (t["jobs_completed"] as number) ?? 0,
      avg_resolution_hours: (t["avg_resolution_hours"] as number | null),
      customer_rating:      (t["customer_rating"] as number | null),
      sla_compliance:       (t["sla_compliance"] as number | null),
      first_time_fix_rate:  (t["first_time_fix_rate"] as number | null),
    },
    today_workload: {
      assigned_jobs:  w["assigned_jobs"],
      completed_jobs: w["completed_jobs"],
      pending_jobs:   w["pending_jobs"],
      travel_hours:   w["travel_hours"],
      work_hours:     w["work_hours"],
    },
  };
}
