/**
 * auth/efn-auth-invite/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Business logic for inviting org users, vendor staff, and technicians.
 *
 * Flow:
 *   1. Validate actor permissions (role-based invite matrix)
 *   2. Assert tenant isolation (actor can only invite into their own org/vendor)
 *   3. Check license seat limits
 *   4. Check user doesn't already exist
 *   5. Send Supabase Auth invitation (creates auth.users + sends email)
 *   6. Upsert invitation record in organization_members / vendor_members
 *   7. Write audit_log + activity_timeline
 *   8. Publish USER_INVITED event
 */

import { adminClient }         from "../../shared/db/client.ts";
import { createLogger }        from "../../shared/logging/logger.ts";
import { publishEvent }        from "../../shared/events/publisher.ts";
import { EVENTS }              from "../../shared/events/event-types.ts";
import { generateUuid }        from "../../shared/utils/uuid-helpers.ts";
import { nowUtc, addDays }     from "../../shared/utils/date-helpers.ts";
import { sha256 }              from "../../shared/utils/crypto-helpers.ts";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/app-error.ts";
import type { AppClaims }        from "../../shared/auth/types.ts";
import type { InviteResult }     from "./types.ts";
import { INVITE_PERMISSIONS }    from "./types.ts";
import type { InviteUserInput }  from "./schema.ts";

const FUNCTION_NAME     = "efn-auth-invite";
const INVITE_EXPIRY_DAYS = 7;

export async function inviteUser(
  body:          InviteUserInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<InviteResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Permission check — can this role invite the target role? ───
  const allowedRoles = INVITE_PERMISSIONS[claims.app_role] ?? [];
  if (!allowedRoles.includes(body.role)) {
    throw new ForbiddenError(
      `Role '${claims.app_role}' cannot invite role '${body.role}'`,
      correlationId,
    );
  }

  // ── 2. Tenant isolation ───────────────────────────────────────────
  if (body.org_id && !claims.is_platform_admin && claims.org_id !== body.org_id) {
    throw new ForbiddenError("Cannot invite into a different organization", correlationId);
  }
  if (body.vendor_id && !claims.is_platform_admin && claims.vendor_id !== body.vendor_id) {
    throw new ForbiddenError("Cannot invite into a different vendor", correlationId);
  }

  // ── 3. License seat limit check ───────────────────────────────────
  if (body.org_id) {
    const { data: org } = await db
      .from("organizations")
      .select("license_seats_users")
      .eq("id", body.org_id)
      .maybeSingle();

    if (!org) throw new NotFoundError("Organization", correlationId);

    const { count } = await db
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("org_id", body.org_id)
      .in("status", ["active", "pending"]);

    if ((count ?? 0) >= (org as { license_seats_users: number }).license_seats_users) {
      throw new ConflictError(
        "Organization has reached its user seat limit. Upgrade the plan to invite more users.",
        correlationId,
      );
    }
  }

  // ── 4. Check for duplicate invite ─────────────────────────────────
  const { data: existingProfile } = await db
    .from("profiles")
    .select("id, status")
    .eq("email", body.email)
    .maybeSingle();

  if (existingProfile && (existingProfile as { status: string }).status === "active") {
    throw new ConflictError(`User '${body.email}' already has an active account`, correlationId);
  }

  // ── 5. Send Supabase Auth invitation email ────────────────────────
  // This creates the auth.users row and sends the magic-link invite email.
  const redirectTo = `${Deno.env.get("APP_URL") ?? ""}/auth/accept-invite`;
  const { data: inviteData, error: inviteErr } = await db.auth.admin.inviteUserByEmail(
    body.email,
    {
      redirectTo,
      data: {
        role:       body.role,
        first_name: body.first_name ?? "",
        last_name:  body.last_name  ?? "",
        org_id:     body.org_id     ?? null,
        vendor_id:  body.vendor_id  ?? null,
      },
    },
  );

  if (inviteErr || !inviteData?.user) {
    throw new ConflictError(`Failed to send invitation: ${inviteErr?.message ?? "Unknown error"}`, correlationId);
  }

  const invitedUserId = inviteData.user.id;
  const expiresAt     = addDays(new Date(), INVITE_EXPIRY_DAYS).toISOString();

  // Generate a token for the membership record (stored as SHA-256 hash)
  const rawToken    = generateUuid();
  const tokenHash   = await sha256(rawToken);
  const inviteId    = generateUuid();

  // ── 6. Upsert membership record ───────────────────────────────────
  if (body.org_id) {
    await db.from("organization_members").upsert(
      {
        id:                   inviteId,
        org_id:               body.org_id,
        user_id:              invitedUserId,
        role:                 body.role,
        invited_by:           claims.sub,
        invited_at:           nowUtc(),
        invitation_token:     tokenHash,
        invitation_expires_at: expiresAt,
        status:               "pending",
      },
      { onConflict: "org_id,user_id" },
    );
  } else if (body.vendor_id) {
    await db.from("vendor_members").upsert(
      {
        id:                   inviteId,
        vendor_id:            body.vendor_id,
        user_id:              invitedUserId,
        role:                 body.role,
        invited_by:           claims.sub,
        invited_at:           nowUtc(),
        invitation_token:     tokenHash,
        invitation_expires_at: expiresAt,
        status:               "pending",
      },
      { onConflict: "vendor_id,user_id" },
    );
  }

  // ── 7. Audit log ──────────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      claims.org_id,
    vendor_id:   claims.vendor_id,
    entity_type: "invitation",
    entity_id:   inviteId,
    action:      "USER_INVITED",
    new_value:   { email: body.email, role: body.role, org_id: body.org_id, vendor_id: body.vendor_id },
    ip_address:  ipAddress  ?? null,
    user_agent:  userAgent  ?? null,
    timestamp:   nowUtc(),
  });

  // ── 8. Activity timeline ──────────────────────────────────────────
  const timelineEntityId = body.org_id ?? body.vendor_id ?? claims.sub;
  const timelineEntityType = body.org_id ? "organization" : "vendor";

  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      timelineEntityType,
    entity_id:        timelineEntityId,
    activity_type:    "user_invited",
    description:      `${body.email} was invited as ${body.role}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { invitation_id: inviteId, email: body.email, role: body.role, correlation_id: correlationId },
    occurred_at:      nowUtc(),
  });

  // ── 9. Publish event ──────────────────────────────────────────────
  await publishEvent({
    event_name:      EVENTS.USER_INVITED,
    payload:         { invitation_id: inviteId, email: body.email, role: body.role, invited_by: claims.sub },
    org_id:          claims.org_id,
    vendor_id:       claims.vendor_id,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({
    correlationId,
    invitation_id: inviteId,
    email:         body.email,
    role:          body.role,
  }, "Invitation sent successfully");

  return {
    invitation_id: inviteId,
    email:         body.email,
    role:          body.role,
    expires_at:    expiresAt,
    status:        "pending",
  };
}
