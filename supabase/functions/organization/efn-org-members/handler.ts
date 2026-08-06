/**
 * organization/efn-org-members/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Manage organization members (suspend, reactivate, remove, change role).
 *
 * Updates both `profiles` and `organization_members`.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { ManageMemberResult } from "./types.ts";
import type { ManageMemberInput } from "./schema.ts";

const FUNCTION_NAME = "efn-org-members";

export async function manageOrgMember(
  body:          ManageMemberInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<ManageMemberResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Tenant Isolation ───────────────────────────────────────────
  if (!claims.is_platform_admin && claims.org_id !== body.org_id) {
    throw new ForbiddenError("Cannot manage members for a different organization", correlationId);
  }

  // Prevent self-modification
  if (body.user_id === claims.sub) {
    throw new ForbiddenError("You cannot modify your own membership status", correlationId);
  }

  // ── 2. Verify Member Exists ───────────────────────────────────────
  const { data: member, error: memberErr } = await db
    .from("organization_members")
    .select("status, role")
    .eq("org_id", body.org_id)
    .eq("user_id", body.user_id)
    .maybeSingle();

  if (memberErr || !member) throw new NotFoundError("Organization member", correlationId);

  const now = nowUtc();
  let newStatus = (member as any).status;
  let newRole   = (member as any).role;
  let eventName = "";

  // ── 3. Apply Action ───────────────────────────────────────────────
  switch (body.action) {
    case "suspend":
      newStatus = "suspended";
      eventName = "organization.member.suspended";
      break;
    case "reactivate":
      newStatus = "active";
      eventName = "organization.member.reactivated";
      break;
    case "remove":
      newStatus = "inactive";
      eventName = "organization.member.removed";
      break;
    case "change_role":
      newRole = body.role;
      eventName = "organization.member.role_changed";
      break;
  }

  // ── 4. Update Database ────────────────────────────────────────────
  // Update organization_members junction
  await db.from("organization_members").update({
    status: newStatus,
    role:   newRole,
    updated_at: now,
  }).eq("org_id", body.org_id).eq("user_id", body.user_id);

  // Update primary profile (keep role in sync)
  const profilePatch: any = { updated_at: now };
  if (body.action === "change_role") profilePatch.role = newRole;
  if (body.action === "remove") {
    profilePatch.status = "inactive";
    profilePatch.org_id = null; // Unlink from org
  }
  if (body.action === "suspend") profilePatch.status = "suspended";
  if (body.action === "reactivate") profilePatch.status = "active";

  await db.from("profiles").update(profilePatch).eq("id", body.user_id);

  if (body.action === "remove" || body.action === "suspend") {
    // Revoke their session immediately
    await db.auth.admin.signOut(body.user_id, "global");
  }

  // ── 5. Audit Log ──────────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      body.org_id,
    vendor_id:   null,
    entity_type: "organization_member",
    entity_id:   body.user_id,
    action:      body.action.toUpperCase(),
    old_value:   { status: (member as any).status, role: (member as any).role },
    new_value:   { status: newStatus, role: newRole },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  // ── 6. Activity Timeline ──────────────────────────────────────────
  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "organization",
    entity_id:        body.org_id,
    activity_type:    eventName.replace(/\./g, "_"),
    description:      `Member ${body.user_id} was ${body.action === 'change_role' ? 'role changed' : body.action}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { target_user_id: body.user_id, action: body.action, correlation_id: correlationId },
    occurred_at:      now,
  });

  // ── 7. Publish Event ──────────────────────────────────────────────
  await publishEvent({
    event_name:      eventName as never,
    payload:         { org_id: body.org_id, target_user_id: body.user_id, action: body.action, new_status: newStatus, new_role: newRole },
    org_id:          body.org_id,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, org_id: body.org_id, target_user_id: body.user_id, action: body.action }, "Organization member managed");

  return { org_id: body.org_id, user_id: body.user_id, action: body.action, status: newStatus };
}
