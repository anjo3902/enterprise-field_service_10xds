/**
 * organization/efn-org-update/types.ts
 */

export interface UpdateOrgResult {
  org_id:     string;
  updated_at: string;
  changes:    string[];   // Human-readable list of changed fields
}
