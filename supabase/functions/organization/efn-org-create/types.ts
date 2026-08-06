/**
 * organization/efn-org-create/types.ts
 * ─────────────────────────────────────────────────────────────────
 * Types for organization creation.
 */

export interface CreateOrgInput {
  name:                     string;
  industry?:                string;
  description?:             string;
  plan:                     "trial" | "professional" | "enterprise";
  admin_name:               string;
  admin_email:              string;
  admin_phone?:             string;
  region?:                  string;
  city?:                    string;
  country?:                 string;
  timezone?:                string;
  language?:                string;
  license_seats_users?:     number;
  license_seats_vendors?:   number;
  license_seats_technicians?: number;
  subscription_renewal?:    string;
}

export interface CreateOrgResult {
  org_id:       string;
  org_code:     string;
  name:         string;
  plan:         string;
  status:       string;
  created_at:   string;
}

/** Seat defaults by subscription plan */
export const PLAN_SEAT_DEFAULTS: Record<string, { users: number; vendors: number; technicians: number }> = {
  trial:        { users: 5,   vendors: 1,  technicians: 10  },
  professional: { users: 50,  vendors: 5,  technicians: 100 },
  enterprise:   { users: 500, vendors: 50, technicians: 1000 },
};

/** Default business hours configuration for new orgs */
export const DEFAULT_BUSINESS_HOURS = {
  name:                  "Standard Business Hours",
  working_days:          ["Mon", "Tue", "Wed", "Thu", "Fri"],
  start_time:            "08:00:00",
  end_time:              "17:00:00",
  break_duration_minutes: 60,
  timezone:              "UTC",
};
