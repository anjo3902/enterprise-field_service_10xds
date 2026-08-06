/**
 * auth/assert-tenant.ts
 * ─────────────────────────────────────────────────────────────────
 * Tenant isolation enforcement — ensures the resource being accessed
 * belongs to the same org/vendor as the caller's JWT claims.
 *
 * This is the primary defence against cross-tenant data leakage
 * at the Edge Function layer (RLS is the second layer of defence).
 *
 * Usage:
 *   assertOrgTenant(claims, ticket.org_id, correlationId);
 *   assertVendorTenant(claims, workOrder.vendor_id, correlationId);
 */

import { TenantMismatchError } from "../errors/app-error.ts";
import type { AppClaims } from "./types.ts";

/**
 * Asserts the resource's org_id matches the caller's JWT org_id.
 * Platform admins bypass all tenant checks.
 *
 * @throws TenantMismatchError  if org_id does not match.
 */
export function assertOrgTenant(
  claims: AppClaims,
  resourceOrgId: string | null,
  correlationId?: string,
): void {
  if (claims.is_platform_admin) return;

  if (!claims.org_id || claims.org_id !== resourceOrgId) {
    throw new TenantMismatchError(
      `Caller org '${claims.org_id}' does not match resource org '${resourceOrgId}'`,
      correlationId,
    );
  }
}

/**
 * Asserts the resource's vendor_id matches the caller's JWT vendor_id.
 * Platform admins bypass all tenant checks.
 *
 * @throws TenantMismatchError  if vendor_id does not match.
 */
export function assertVendorTenant(
  claims: AppClaims,
  resourceVendorId: string | null,
  correlationId?: string,
): void {
  if (claims.is_platform_admin) return;

  if (!claims.vendor_id || claims.vendor_id !== resourceVendorId) {
    throw new TenantMismatchError(
      `Caller vendor '${claims.vendor_id}' does not match resource vendor '${resourceVendorId}'`,
      correlationId,
    );
  }
}

/**
 * Asserts the resource belongs to the technician making the request.
 * Vendor Admins can manage any technician in their vendor.
 * Platform admins bypass all checks.
 *
 * @throws TenantMismatchError  if technician_id does not match.
 */
export function assertTechnicianScope(
  claims: AppClaims,
  resourceTechId: string | null,
  resourceVendorId: string | null,
  correlationId?: string,
): void {
  if (claims.is_platform_admin) return;

  // Vendor admin can manage all technicians in their vendor
  if (claims.app_role === "vendor_admin" && claims.vendor_id === resourceVendorId) return;
  if (claims.app_role === "vendor_staff" && claims.vendor_id === resourceVendorId)  return;

  // Technician can only access their own records
  if (claims.tech_id !== resourceTechId) {
    throw new TenantMismatchError(
      "Technician can only access their own records",
      correlationId,
    );
  }
}
