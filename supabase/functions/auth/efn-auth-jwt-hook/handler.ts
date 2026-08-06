/**
 * auth/efn-auth-jwt-hook/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Builds the enriched JWT app_metadata claims from the database.
 *
 * Reads:
 *   1. profiles           → role, org_id, vendor_id, tech_id, status, locked_until
 *   2. organizations      → plan (license_type) when org_id is set
 *
 * Injects into app_metadata:
 *   app_role, org_id, vendor_id, tech_id, tenant_type,
 *   is_platform_admin, license_type
 *
 * Security notes:
 *   - Uses adminClient() because GoTrue internal hooks bypass user JWT.
 *   - A locked or inactive account gets app_role: 'locked' to block all RLS.
 *   - Never leaks internal IDs beyond what is needed for RLS evaluation.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import type { JwtHookPayload, JwtHookResponse, ProfileRow, OrganizationRow } from "./types.ts";

const FUNCTION_NAME = "efn-auth-jwt-hook";

export async function buildJwtClaims(
  payload:       JwtHookPayload,
  correlationId: string,
): Promise<JwtHookResponse> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Load profile ───────────────────────────────────────────────
  const { data: profile, error: profileErr } = await db
    .from("profiles")
    .select("id, role, org_id, vendor_id, tech_id, assigned_entity_type, status, locked_until")
    .eq("id", payload.user_id)
    .maybeSingle();

  if (profileErr) {
    log.error({ correlationId, user_id: payload.user_id, error: profileErr.message }, "Profile lookup failed");
    // Return minimal claims so login doesn't hard-fail — access will be denied by RLS
    return minimalClaims(payload, "org_user");
  }

  if (!profile) {
    // Profile not yet created (race between JWT hook and trg_auth_user_created trigger)
    log.warn({ correlationId, user_id: payload.user_id }, "Profile not found — returning minimal claims");
    return minimalClaims(payload, "org_user");
  }

  const p = profile as ProfileRow;

  // ── 2. Account lockout / inactive check ──────────────────────────
  const isLocked =
    p.status === "suspended" ||
    p.status === "inactive"  ||
    (p.locked_until !== null && new Date(p.locked_until) > new Date());

  if (isLocked) {
    log.warn({ correlationId, user_id: payload.user_id, status: p.status }, "Account locked — restricting claims");
    return {
      claims: {
        ...payload.claims,
        app_metadata: {
          ...payload.claims.app_metadata,
          app_role:          "locked",
          org_id:            null,
          vendor_id:         null,
          tech_id:           null,
          tenant_type:       "system",
          is_platform_admin: false,
          license_type:      null,
        },
      },
    };
  }

  // ── 3. Resolve license_type from org plan (when applicable) ──────
  let licenseType: string | null = null;
  if (p.org_id) {
    const { data: org } = await db
      .from("organizations")
      .select("id, plan")
      .eq("id", p.org_id)
      .maybeSingle();

    licenseType = (org as OrganizationRow | null)?.plan ?? null;
  }

  // ── 4. Determine tenant_type ──────────────────────────────────────
  const tenantType =
    (p.assigned_entity_type as string | null) ??
    (p.org_id    ? "org"    :
     p.vendor_id ? "vendor" : "system");

  const isPlatformAdmin = p.role === "system_admin";

  // ── 5. Update last_login_at (fire-and-forget, non-blocking) ──────
  db.from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", payload.user_id)
    .then(() => null);   // intentionally non-awaited

  log.info({
    correlationId,
    user_id:   payload.user_id,
    app_role:  p.role,
    tenant_type: tenantType,
  }, "JWT claims built successfully");

  // ── 6. Return enriched claims ─────────────────────────────────────
  return {
    claims: {
      ...payload.claims,
      app_metadata: {
        ...payload.claims.app_metadata,
        app_role:          p.role,
        org_id:            p.org_id,
        vendor_id:         p.vendor_id,
        tech_id:           p.tech_id,
        tenant_type:       tenantType,
        is_platform_admin: isPlatformAdmin,
        license_type:      licenseType,
      },
    },
  };
}

// ── Helper: safe fallback claims ──────────────────────────────────

function minimalClaims(payload: JwtHookPayload, role: string): JwtHookResponse {
  return {
    claims: {
      ...payload.claims,
      app_metadata: {
        ...payload.claims.app_metadata,
        app_role:          role,
        org_id:            null,
        vendor_id:         null,
        tech_id:           null,
        tenant_type:       "system",
        is_platform_admin: false,
        license_type:      null,
      },
    },
  };
}
