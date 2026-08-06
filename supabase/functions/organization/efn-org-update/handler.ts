/**
 * organization/efn-org-update/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Updates an organization's profile, branding, settings, and license.
 *
 * Access rules (enforced here, not only in index.ts):
 *   system_admin  → can update any field including plan, status, seats
 *   org_admin     → can update profile/branding/contact only (no plan/status/seats)
 *
 * Diff audit: captures before/after values for every changed field.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../../shared/errors/app-error.ts";
import type { AppClaims }    from "../../shared/auth/types.ts";
import type { UpdateOrgResult } from "./types.ts";
import type { UpdateOrgInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-org-update";

// Fields that only system_admin may update
const SYSTEM_ADMIN_ONLY_FIELDS = new Set(["plan", "license_seats_users", "license_seats_vendors", "license_seats_technicians", "subscription_renewal", "status", "suspended_reason"]);

export async function updateOrganization(
  body:          UpdateOrgInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<UpdateOrgResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Load current org ───────────────────────────────────────────
  const { data: current, error: fetchErr } = await db
    .from("organizations")
    .select("*")
    .eq("id", body.org_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !current) throw new NotFoundError("Organization", correlationId);

  // ── 2. Tenant isolation for org_admin ─────────────────────────────
  if (!claims.is_platform_admin && claims.org_id !== body.org_id) {
    throw new ForbiddenError("Cannot update a different organization", correlationId);
  }

  // ── 3. System-admin-only field guard ─────────────────────────────
  if (!claims.is_platform_admin) {
    for (const key of Object.keys(body)) {
      if (SYSTEM_ADMIN_ONLY_FIELDS.has(key) && body[key as keyof UpdateOrgInput] !== undefined) {
        throw new ForbiddenError(`Only system_admin can update field '${key}'`, correlationId);
      }
    }
  }

  // ── 4. Admin email uniqueness check ──────────────────────────────
  if (body.admin_email && body.admin_email !== (current as Record<string, unknown>)["admin_email"]) {
    const { data: dupe } = await db
      .from("organizations")
      .select("id")
      .eq("admin_email", body.admin_email)
      .neq("id", body.org_id)
      .maybeSingle();
    if (dupe) throw new ConflictError(`Email '${body.admin_email}' is already used by another organization`, correlationId);
  }

  // ── 5. Build update patch + diff ─────────────────────────────────
  const { org_id, ...fields } = body;
  const patch: Record<string, unknown> = {};
  const oldValues: Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const currentVal = (current as Record<string, unknown>)[key];
    if (currentVal !== value) {
      patch[key]      = value;
      oldValues[key]  = currentVal;
      changedFields.push(key);
    }
  }

  if (changedFields.length === 0) {
    return { org_id, updated_at: (current as Record<string, string>)["updated_at"], changes: [] };
  }

  patch["updated_by"] = claims.sub;
  patch["updated_at"] = nowUtc();

  // Status transition events
  const isStatusChange = "status" in patch;
  const newStatus      = patch["status"] as string | undefined;

  if (isStatusChange && newStatus === "suspended" && !patch["suspended_at"]) {
    patch["suspended_at"] = nowUtc();
  }

  // ── 6. Update organization ────────────────────────────────────────
  const { error: updateErr } = await db
    .from("organizations")
    .update(patch)
    .eq("id", org_id);

  if (updateErr) throw new Error(`Organization update failed: ${updateErr.message}`);

  const updatedAt = patch["updated_at"] as string;

  // ── 7. Audit log ──────────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      org_id,
    entity_type: "organization",
    entity_id:   org_id,
    action:      "UPDATE",
    old_value:   oldValues,
    new_value:   patch,
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   updatedAt,
  });

  // ── 8. Activity timeline ──────────────────────────────────────────
  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "organization",
    entity_id:        org_id,
    activity_type:    "organization_updated",
    description:      `Organization updated: ${changedFields.join(", ")}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { changed_fields: changedFields, correlation_id: correlationId },
    occurred_at:      updatedAt,
  });

  // ── 9. Publish event ──────────────────────────────────────────────
  const eventName = isStatusChange && newStatus === "suspended"
    ? "organization.suspended"
    : isStatusChange && newStatus === "active"
    ? "organization.reactivated"
    : "organization.updated";

  await publishEvent({
    event_name:      eventName as never,
    payload:         { org_id, changed_fields: changedFields, new_values: patch },
    org_id:          org_id,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, org_id, changedFields }, "Organization updated");
  return { org_id, updated_at: updatedAt, changes: changedFields };
}
