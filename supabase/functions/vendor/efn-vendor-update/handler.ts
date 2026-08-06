/**
 * vendor/efn-vendor-update/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Updates vendor profile, branding, service config, status, and license.
 *
 * Access rules:
 *   system_admin  → full access (status, sla_target, trade_domains, etc.)
 *   vendor_admin  → profile/contact/branding only (no status, sla_target)
 *
 * Tenant isolation:
 *   vendor_admin can only update their own vendor (claims.vendor_id === body.vendor_id)
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
import type { AppClaims }         from "../../shared/auth/types.ts";
import type { UpdateVendorResult } from "./types.ts";
import type { UpdateVendorInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-vendor-update";

const SYSTEM_ADMIN_ONLY_FIELDS = new Set([
  "status", "suspended_reason", "sla_target", "trade_domains",
]);

export async function updateVendor(
  body:          UpdateVendorInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<UpdateVendorResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Load Current Vendor ────────────────────────────────────────
  const { data: current, error: fetchErr } = await db
    .from("vendors")
    .select("*")
    .eq("id", body.vendor_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !current) throw new NotFoundError("Vendor", correlationId);

  // ── 2. Tenant Isolation for vendor_admin ──────────────────────────
  if (!claims.is_platform_admin && claims.vendor_id !== body.vendor_id) {
    throw new ForbiddenError("Cannot update a different vendor", correlationId);
  }

  // ── 3. System-admin-only Field Guard ─────────────────────────────
  if (!claims.is_platform_admin) {
    for (const key of Object.keys(body)) {
      if (SYSTEM_ADMIN_ONLY_FIELDS.has(key) && body[key as keyof UpdateVendorInput] !== undefined) {
        throw new ForbiddenError(`Only system_admin can update field '${key}'`, correlationId);
      }
    }
  }

  // ── 4. Duplicate Name Check (if name changed) ─────────────────────
  if (body.name && body.name !== (current as Record<string, unknown>)["name"]) {
    const { data: dupe } = await db
      .from("vendors")
      .select("id")
      .ilike("name", body.name)
      .neq("id", body.vendor_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (dupe) throw new ConflictError(`Vendor name '${body.name}' already exists`, correlationId);
  }

  // ── 5. Build Diff Patch ───────────────────────────────────────────
  const { vendor_id, ...fields } = body;
  const patch: Record<string, unknown> = {};
  const oldValues: Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const currentVal = (current as Record<string, unknown>)[key];
    // Deep compare for arrays/objects
    if (JSON.stringify(currentVal) !== JSON.stringify(value)) {
      patch[key]     = value;
      oldValues[key] = currentVal;
      changedFields.push(key);
    }
  }

  if (changedFields.length === 0) {
    return { vendor_id, updated_at: (current as Record<string, string>)["updated_at"], changes: [] };
  }

  const now = nowUtc();
  patch["updated_by"] = claims.sub;
  patch["updated_at"] = now;

  // Handle suspension timestamps
  if ("status" in patch && patch["status"] === "suspended") {
    patch["suspended_at"]     = now;
    patch["suspended_reason"] = body.suspended_reason ?? "Suspended by admin";
  } else if ("status" in patch && patch["status"] !== "suspended") {
    patch["suspended_at"]     = null;
    patch["suspended_reason"] = null;
  }

  // ── 6. Update Vendor ──────────────────────────────────────────────
  const { error: updateErr } = await db
    .from("vendors")
    .update(patch)
    .eq("id", vendor_id);

  if (updateErr) throw new Error(`Vendor update failed: ${updateErr.message}`);

  // ── 7. Audit Log ──────────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      null,
    vendor_id:   vendor_id,
    entity_type: "vendor",
    entity_id:   vendor_id,
    action:      "UPDATE",
    old_value:   oldValues,
    new_value:   patch,
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  // ── 8. Activity Timeline ──────────────────────────────────────────
  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "vendor",
    entity_id:        vendor_id,
    activity_type:    "vendor_updated",
    description:      `Vendor updated: ${changedFields.join(", ")}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { changed_fields: changedFields, correlation_id: correlationId },
    occurred_at:      now,
  });

  // ── 9. Publish Event ──────────────────────────────────────────────
  const isStatusChange = "status" in patch;
  const eventName = isStatusChange && patch["status"] === "suspended"
    ? "vendor.suspended"
    : isStatusChange && patch["status"] === "active"
    ? "vendor.reactivated"
    : "vendor.updated";

  await publishEvent({
    event_name:      eventName as never,
    payload:         { vendor_id, changed_fields: changedFields },
    vendor_id:       vendor_id,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, vendor_id, changedFields }, "Vendor updated");
  return { vendor_id, updated_at: now, changes: changedFields };
}
