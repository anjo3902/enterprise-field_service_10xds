/**
 * auth/efn-auth-invite/types.ts
 * ─────────────────────────────────────────────────────────────────
 * Types for the invite flow.
 */

export type InvitableRole = "org_admin" | "org_user" | "vendor_admin" | "vendor_staff" | "technician";

export interface InviteUserInput {
  email:       string;
  role:        InvitableRole;
  first_name?: string;
  last_name?:  string;
  org_id?:     string | null;
  vendor_id?:  string | null;
  message?:    string;   // Optional personal note in invitation email
}

export interface InviteResult {
  invitation_id: string;
  email:         string;
  role:          InvitableRole;
  expires_at:    string;
  status:        "pending";
}

/** Allowed invitation role matrix per actor role */
export const INVITE_PERMISSIONS: Record<string, InvitableRole[]> = {
  system_admin:  ["org_admin", "org_user", "vendor_admin", "vendor_staff", "technician"],
  org_admin:     ["org_user"],
  vendor_admin:  ["vendor_staff", "technician"],
};
