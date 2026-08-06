/**
 * auth/assert-role.ts
 * ─────────────────────────────────────────────────────────────────
 * Role guard — throws ForbiddenError if the caller's role is not
 * in the allowed list.
 *
 * System Admins (is_platform_admin = true) always bypass role checks.
 *
 * Usage:
 *   assertRole(ctx.claims, ["org_admin", "org_user"], ctx.correlationId);
 */

import { ForbiddenError } from "../errors/app-error.ts";
import type { AppClaims, UserRole } from "./types.ts";

/**
 * Asserts the caller has one of the `allowedRoles`.
 * Platform admins bypass all role checks.
 *
 * @throws ForbiddenError  if role is not allowed.
 */
export function assertRole(
  claims: AppClaims,
  allowedRoles: UserRole[],
  correlationId?: string,
): void {
  if (claims.is_platform_admin) return; // System Admin bypasses everything

  if (!allowedRoles.includes(claims.app_role)) {
    throw new ForbiddenError(
      `Role '${claims.app_role}' is not permitted. Required: [${allowedRoles.join(", ")}]`,
      correlationId,
    );
  }
}
