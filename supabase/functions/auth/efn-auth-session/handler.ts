/**
 * auth/efn-auth-session/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Session business logic.
 *
 * getSession:    Returns the current user's full profile enriched with
 *                their permissions list — used by the frontend on app load.
 * revokeSession: Signs the user out (all devices or current session only).
 *                Writes audit log on every revocation.
 */

import { adminClient }           from "../../shared/db/client.ts";
import { createLogger }          from "../../shared/logging/logger.ts";
import { generateUuid }          from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }                from "../../shared/utils/date-helpers.ts";
import { getPermissionsForRole } from "../../shared/auth/permission-check.ts";
import type { AppClaims, UserRole } from "../../shared/auth/types.ts";
import type { SessionInfo }      from "./types.ts";

const FUNCTION_NAME = "efn-auth-session";

// ── Get Session ───────────────────────────────────────────────────

export async function getSession(
  claims:        AppClaims,
  correlationId: string,
): Promise<SessionInfo> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  const { data: profile } = await db
    .from("profiles")
    .select("id, full_name, avatar_url, last_login_at")
    .eq("id", claims.sub)
    .maybeSingle();

  const permissions = getPermissionsForRole(claims.app_role as UserRole);

  log.info({ correlationId, user_id: claims.sub }, "Session retrieved");

  return {
    user_id:       claims.sub,
    email:         claims.email,
    role:          claims.app_role,
    org_id:        claims.org_id,
    vendor_id:     claims.vendor_id,
    tech_id:       claims.tech_id,
    tenant_type:   claims.tenant_type,
    full_name:     (profile as { full_name?: string | null } | null)?.full_name ?? null,
    avatar_url:    (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null,
    last_login_at: (profile as { last_login_at?: string | null } | null)?.last_login_at ?? null,
    permissions,
  };
}

// ── Revoke Session ────────────────────────────────────────────────

export async function revokeSession(
  claims:        AppClaims,
  revokeAll:     boolean,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<{ revoked: boolean; scope: "all" | "current" }> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  if (revokeAll) {
    // Sign out from ALL devices (invalidates all refresh tokens)
    const { error } = await db.auth.admin.signOut(claims.sub, "global");
    if (error) {
      log.error({ correlationId, user_id: claims.sub, error: error.message }, "Global sign-out failed");
      throw new Error(`Sign-out failed: ${error.message}`);
    }
  }
  // For "current session only" — the client-side SDK handles the token discard.
  // The backend records the audit event regardless.

  // Audit log
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      claims.org_id,
    vendor_id:   claims.vendor_id,
    entity_type: "session",
    entity_id:   claims.sub,
    action:      revokeAll ? "LOGOUT_ALL_DEVICES" : "LOGOUT",
    new_value:   { scope: revokeAll ? "global" : "current" },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   nowUtc(),
  });

  log.info({ correlationId, user_id: claims.sub, scope: revokeAll ? "all" : "current" }, "Session revoked");
  return { revoked: true, scope: revokeAll ? "all" : "current" };
}
