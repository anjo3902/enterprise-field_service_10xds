/**
 * vendor/efn-vendor-create/types.ts
 * ─────────────────────────────────────────────────────────────────
 * Types for vendor creation.
 */

import type { ServiceDomain } from "../../shared/types/enums.ts";

export interface CreateVendorInput {
  name:              string;
  trade_domains:     ServiceDomain[];
  service_regions?:  string[];
  manager_name?:     string;
  manager_email?:    string;
  manager_phone?:    string;
  sla_target?:       number;
  license_number?:   string;
  license_expiry?:   string;
  contract_id?:      string;  // External ERP reference
}

export interface CreateVendorResult {
  vendor_id:    string;
  vendor_code:  string;
  name:         string;
  status:       string;
  created_at:   string;
}

/** Generate a vendor code e.g. "VND-2026-ABCD" */
export function generateVendorCode(): string {
  const year   = new Date().getUTCFullYear();
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `VND-${year}-${suffix}`;
}
