/**
 * organization/efn-org-license/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Get organization license allocation and current seat usage.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { LicenseStatusResult } from "./types.ts";
import type { GetLicenseInput } from "./schema.ts";

const FUNCTION_NAME = "efn-org-license";

export async function getOrgLicense(
  body:          GetLicenseInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<LicenseStatusResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Tenant Isolation ───────────────────────────────────────────
  if (!claims.is_platform_admin && claims.org_id !== body.org_id) {
    throw new ForbiddenError("Cannot view license for a different organization", correlationId);
  }

  // ── 2. Read License Limits from Organization ──────────────────────
  const { data: org, error: orgErr } = await db
    .from("organizations")
    .select("plan, status, subscription_renewal, license_seats_users, license_seats_vendors, license_seats_technicians")
    .eq("id", body.org_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (orgErr || !org) throw new NotFoundError("Organization", correlationId);

  // ── 3. Calculate Current Usage ────────────────────────────────────
  
  // Users (Active & Pending org members)
  const { count: usersCount } = await db
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("org_id", body.org_id)
    .in("status", ["active", "pending"]);

  // Vendors (Active vendor contracts)
  // We don't have the full contracts schema in focus, but based on the enum/migrations it exists
  const { count: vendorsCount } = await db
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", body.org_id)
    .in("status", ["active"]);

  // Technicians (Across all vendors linked to this org)
  // Approximate by counting technicians belonging to active vendors
  const { data: activeVendors } = await db
    .from("contracts")
    .select("vendor_id")
    .eq("org_id", body.org_id)
    .in("status", ["active"]);

  let techniciansCount = 0;
  if (activeVendors && activeVendors.length > 0) {
    const vendorIds = activeVendors.map((v: any) => v.vendor_id);
    const { count: techCount } = await db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("vendor_id", vendorIds)
      .eq("role", "technician")
      .eq("status", "active")
      .is("deleted_at", null);
    techniciansCount = techCount ?? 0;
  }

  const uAlloc = (org as any).license_seats_users;
  const vAlloc = (org as any).license_seats_vendors;
  const tAlloc = (org as any).license_seats_technicians;

  const uUsed = usersCount ?? 0;
  const vUsed = vendorsCount ?? 0;
  const tUsed = techniciansCount ?? 0;

  log.info({ correlationId, org_id: body.org_id }, "Organization license retrieved");

  return {
    org_id: body.org_id,
    plan: (org as any).plan,
    status: (org as any).status,
    subscription_renewal: (org as any).subscription_renewal,
    seats: {
      users: {
        allocated: uAlloc,
        used:      uUsed,
        available: Math.max(0, uAlloc - uUsed),
      },
      vendors: {
        allocated: vAlloc,
        used:      vUsed,
        available: Math.max(0, vAlloc - vUsed),
      },
      technicians: {
        allocated: tAlloc,
        used:      tUsed,
        available: Math.max(0, tAlloc - tUsed),
      },
    },
  };
}
