/**
 * organization/efn-org-license/types.ts
 */

export interface LicenseStatusResult {
  org_id:                    string;
  plan:                      string;
  status:                    string;
  subscription_renewal:      string | null;
  seats: {
    users: {
      allocated: number;
      used:      number;
      available: number;
    };
    vendors: {
      allocated: number;
      used:      number;
      available: number;
    };
    technicians: {
      allocated: number;
      used:      number;
      available: number;
    };
  };
}
