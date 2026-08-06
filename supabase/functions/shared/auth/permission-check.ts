/**
 * auth/permission-check.ts
 * ─────────────────────────────────────────────────────────────────
 * Fine-grained, action-level permission gates.
 * Used as a third layer of defence after role + tenant checks.
 *
 * Permissions are derived from the JWT app_role claim only —
 * no additional database lookup is needed.
 *
 * Usage:
 *   if (!can(claims, "ticket:close")) {
 *     throw new ForbiddenError("Cannot close ticket", correlationId);
 *   }
 */

import type { AppClaims, UserRole } from "./types.ts";

// ── Permission Map ─────────────────────────────────────────────────

type Permission = string; // e.g. "ticket:create", "work_order:update"

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  system_admin: ["*"],

  org_admin: [
    "ticket:create", "ticket:read", "ticket:update", "ticket:close", "ticket:delete",
    "asset:create", "asset:read", "asset:update", "asset:delete",
    "work_order:read",
    "pm:read", "pm:create", "pm:update",
    "amc:read", "amc:create", "amc:update",
    "warranty:read", "warranty:create",
    "user:invite", "user:manage",
    "contract:read", "contract:create",
    "analytics:read",
    "notification:read",
    "audit:read",
  ],

  org_user: [
    "ticket:create", "ticket:read", "ticket:update",
    "asset:read",
    "work_order:read",
    "notification:read",
    "pm:read",
    "amc:read",
    "warranty:read",
  ],

  vendor_admin: [
    "work_order:create", "work_order:read", "work_order:update", "work_order:close",
    "ticket:read", "ticket:update",
    "dispatch:read", "dispatch:assign", "dispatch:manage",
    "technician:create", "technician:read", "technician:update", "technician:manage",
    "inventory:read", "inventory:create", "inventory:update",
    "user:invite",
    "pm:read", "pm:update",
    "analytics:read",
    "notification:read",
  ],

  vendor_staff: [
    "work_order:read", "work_order:update",
    "ticket:read",
    "dispatch:read", "dispatch:assign",
    "technician:read",
    "inventory:read", "inventory:update",
    "notification:read",
  ],

  technician: [
    "work_order:read:own", "work_order:update:own",
    "ticket:read:own",
    "dispatch:read:own",
    "inventory:read",
    "availability:update:own",
    "gps:update:own",
    "checklist:complete",
    "notification:read",
  ],
};

// ── Permission Check ───────────────────────────────────────────────

/**
 * Returns true if the caller's role grants the requested permission.
 * System Admin always returns true.
 */
export function can(claims: AppClaims, permission: Permission): boolean {
  if (claims.is_platform_admin) return true;

  const perms = ROLE_PERMISSIONS[claims.app_role] ?? [];
  return perms.includes("*") || perms.includes(permission);
}

/**
 * Returns the full permission set for a given role.
 * Used by the JWT hook to embed permissions in the token.
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
