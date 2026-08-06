/**
 * auth/types.ts
 * ─────────────────────────────────────────────────────────────────
 * Shared type definitions for JWT claims and authentication context.
 * Mirrors the Phase 3.1 JWT Claim Specification exactly.
 */

// ── Role ENUM ──────────────────────────────────────────────────────

export type UserRole =
  | "system_admin"
  | "org_admin"
  | "org_user"
  | "vendor_admin"
  | "vendor_staff"
  | "technician";

export type TenantType = "org" | "vendor" | "system";
export type LicenseType = "trial" | "professional" | "enterprise";

// ── JWT App Claims ─────────────────────────────────────────────────

/**
 * The custom claims injected by efn-auth-jwt-hook into every JWT.
 * These live inside the `app_metadata` key of the Supabase JWT payload.
 */
export interface AppClaims {
  /** = auth.users.id = profiles.id */
  sub:               string;
  email:             string;

  /** Application role enum */
  app_role:          UserRole;

  /** Null for system_admin and vendor roles */
  org_id:            string | null;

  /** Null for system_admin and org roles */
  vendor_id:         string | null;

  /** Non-null only when app_role = 'technician' */
  tech_id:           string | null;

  tenant_type:       TenantType;
  is_platform_admin: boolean;
  license_type:      LicenseType | null;
}

// ── Request Context ────────────────────────────────────────────────

/**
 * Attached to every incoming request after JWT verification.
 * Passed through to handlers to avoid re-reading the JWT.
 */
export interface RequestContext {
  claims:         AppClaims;
  correlationId:  string;
  requestId:      string;
  /** Raw Authorization header value (Bearer <jwt>), used to create user-scoped Supabase client */
  authHeader:     string;
}
