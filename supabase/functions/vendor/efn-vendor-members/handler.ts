/**
 * vendor/efn-vendor-members/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Manage vendor members (suspend, reactivate, remove, change_role).
 *
 * Updates both `profiles` and `vendor_members`.
 * Revokes all sessions when a member is suspended or removed.
 * Updates technician_count on the vendors table on add/remove.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { ManageVendorMemberResult } from "./types.ts";
import type { ManageVendorMemberInput } from "./schema.ts";

const FUNCTION_NAME = "efn-vendor-members";

export async function manageVendorMember(
  body:          ManageVendorMemberInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<ManageVendorMemberResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Tenant Isolation ───────────────────────────────────────────
  if (!claims.is_platform_admin && claims.vendor_id !== body.vendor_id) {
    throw new ForbiddenError("Cannot manage members for a different vendor", correlationId);
  }

  // Prevent self-modification
  if (body.user_id === claims.sub) {
    throw new ForbiddenError("You cannot modify your own membership status", correlationId);
  }

  // ── 2. Verify Member Exists ───────────────────────────────────────
  const { data: member, error: memberErr } = await db
    .from("vendor_members")
    .select("status, role")
    .eq("vendor_id", body.vendor_id)
    .eq("user_id", body.user_id)
    .maybeSingle();

  if (memberErr || !member) throw new NotFoundError("Vendor member", correlationId);

  const currentStatus = (member as Record<string, string>)["status"];
  const currentRole   = (member as Record<string, string>)["role"];
  const now           = nowUtc();

  let newStatus = currentStatus;
  let newRole   = currentRole;
  let eventName = "";

  // ── 3. Apply Action ───────────────────────────────────────────────
  switch (body.action) {
    case "suspend":
      newStatus = "suspended";
      eventName = "vendor.member.suspended";
      break;
    case "reactivate":
      newStatus = "active";
      eventName = "vendor.member.reactivated";
      break;
    case "remove":
      newStatus = "inactive";
      eventName = "vendor.member.removed";
      break;
    case "change_role":
      newRole   = body.role!;
      eventName = "vendor.member.role_changed";
      break;
  }

  // ── 4. Update vendor_members ──────────────────────────────────────
  await db.from("vendor_members")
    .update({ status: newStatus, role: newRole, updated_at: now })
    .eq("vendor_id", body.vendor_id)
    .eq("user_id", body.user_id);

  // ── 5. Sync profiles table ────────────────────────────────────────
  const profilePatch: Record<string, unknown> = { updated_at: now };
  if (body.action === "change_role") profilePatch["role"] = newRole;
  if (body.action === "remove") {
    profilePatch["status"]    = "inactive";
    profilePatch["vendor_id"] = null; // Unlink from vendor
  }
  if (body.action === "suspend")    profilePatch["status"] = "suspended";
  if (body.action === "reactivate") profilePatch["status"] = "active";

  await db.from("profiles").update(profilePatch).eq("id", body.user_id);

  // ── 6. Revoke Sessions on Suspend/Remove ─────────────────────────
  if (body.action === "remove" || body.action === "suspend") {
    const { error: signOutErr } = await db.auth.admin.signOut(body.user_id, "global");
    if (signOutErr) {
      log.warn({ correlationId, user_id: body.user_id, error: signOutErr.message }, "Session revocation failed — non-fatal");
    }
  }

  // ── 7. Decrement technician_count if removed technician ──────────
  if (body.action === "remove" && currentRole === "technician") {
    await db.rpc("decrement_vendor_technician_count", { vendor_id_param: body.vendor_id });
  }

  // ── 8. Audit Log ──────────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      null,
    vendor_id:   body.vendor_id,
    entity_type: "vendor_member",
    entity_id:   body.user_id,
    action:      body.action.toUpperCase(),
    old_value:   { status: currentStatus, role: currentRole },
    new_value:   { status: newStatus, role: newRole },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  // ── 9. Activity Timeline ──────────────────────────────────────────
  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "vendor",
    entity_id:        body.vendor_id,
    activity_type:    eventName.replace(/\./g, "_"),
    description:      `Vendor member ${body.user_id}: ${body.action}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         {
      target_user_id: body.user_id,
      action:         body.action,
      correlation_id: correlationId,
    },
    occurred_at: now,
  });

  // ── 10. Publish Event ─────────────────────────────────────────────
  await publishEvent({
    event_name:      eventName as never,
    payload:         {
      vendor_id:      body.vendor_id,
      target_user_id: body.user_id,
      action:         body.action,
      new_status:     newStatus,
      new_role:       newRole,
    },
    vendor_id:       body.vendor_id,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, vendor_id: body.vendor_id, user_id: body.user_id, action: body.action }, "Vendor member managed");
  return { vendor_id: body.vendor_id, user_id: body.user_id, action: body.action, new_status: newStatus };
}
