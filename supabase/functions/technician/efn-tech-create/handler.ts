/**
 * technician/efn-tech-create/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Creates a new Technician entity.
 *
 * This inserts into `technicians` and provisions `technician_availability`.
 * It does NOT create an auth profile (that happens via invitation flow later).
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ConflictError, ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { CreateTechnicianResult } from "./types.ts";
import type { CreateTechnicianInput } from "./schema.ts";

const FUNCTION_NAME = "efn-tech-create";

export async function createTechnician(
  body:          CreateTechnicianInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<CreateTechnicianResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin && claims.vendor_id !== body.vendor_id) {
    throw new ForbiddenError("Cannot create a technician for a different vendor", correlationId);
  }

  // ── 2. Uniqueness Check ───────────────────────────────────────────
  const { data: dupe } = await db
    .from("technicians")
    .select("id")
    .eq("email", body.email)
    .eq("vendor_id", body.vendor_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (dupe) {
    throw new ConflictError("A technician with this email already exists for this vendor", correlationId);
  }

  // ── 3. Insert Technician ──────────────────────────────────────────
  const techId = generateUuid();
  
  const { error: insertErr } = await db.from("technicians").insert({
    id:                techId,
    vendor_id:         body.vendor_id,
    full_name:         body.full_name,
    first_name:        body.first_name ?? null,
    last_name:         body.last_name ?? null,
    email:             body.email,
    phone:             body.phone ?? null,
    employee_id:       body.employee_id ?? null,
    primary_domain:    body.primary_domain ?? null,
    secondary_domains: body.secondary_domains ?? [],
    skills:            body.skills ?? [],
    experience_level:  body.experience_level ?? "technician",
    years_experience:  body.years_experience ?? null,
    status:            "active",
    created_by:        claims.sub,
    created_at:        now,
  });

  if (insertErr) throw new Error(`Technician insert failed: ${insertErr.message}`);

  // ── 4. Initialize Availability ────────────────────────────────────
  await db.from("technician_availability").insert({
    id:                  generateUuid(),
    technician_id:       techId,
    availability_status: "offline", // Initial state
    updated_at:          now,
  });

  // ── 5. Initialize Workload ────────────────────────────────────────
  // technician_workload tracks daily workload. We seed an empty one for today.
  await db.from("technician_workload").insert({
    id:                 generateUuid(),
    technician_id:      techId,
    workload_date:      now.substring(0, 10),
    assigned_jobs:      0,
    completed_jobs:     0,
    pending_jobs:       0,
    travel_hours:       0,
    work_hours:         0,
    overtime_hours:     0,
    capacity_score:     0,
    utilization_score:  0,
    created_at:         now,
  });

  // Increment vendor tech count
  await db.rpc("increment_vendor_technician_count", { vendor_id_param: body.vendor_id });

  // ── 6. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    vendor_id:   body.vendor_id,
    entity_type: "technician",
    entity_id:   techId,
    action:      "CREATE",
    new_value:   { email: body.email, full_name: body.full_name },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "vendor",
    entity_id:        body.vendor_id,
    activity_type:    "technician_created",
    description:      `Technician ${body.full_name} created`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { technician_id: techId, email: body.email, correlation_id: correlationId },
    occurred_at:      now,
  });

  await publishEvent({
    event_name:      "technician.created" as never,
    payload:         { technician_id: techId, vendor_id: body.vendor_id, email: body.email },
    vendor_id:       body.vendor_id,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, techId, vendor_id: body.vendor_id }, "Technician created");
  return { technician_id: techId, vendor_id: body.vendor_id, status: "active", created_at: now };
}
