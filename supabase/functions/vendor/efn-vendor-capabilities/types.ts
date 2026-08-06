/**
 * vendor/efn-vendor-capabilities/types.ts
 */

export type CapabilityAction = "upsert" | "remove";

export interface UpsertCapabilityInput {
  vendor_id:            string;
  service_category_id:  string;
  service_type_id?:     string;
  coverage_region?:     string;
  response_tier?:       string;
  maximum_capacity?:    number;
}

export interface RemoveCapabilityInput {
  vendor_id:      string;
  capability_id:  string;
}

export interface CapabilityResult {
  capability_id: string;
  vendor_id:     string;
  action:        CapabilityAction;
}
