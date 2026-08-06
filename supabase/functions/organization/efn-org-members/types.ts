/**
 * organization/efn-org-members/types.ts
 */

export interface ManageMemberInput {
  org_id:  string;
  user_id: string;
  action:  "remove" | "suspend" | "reactivate" | "change_role";
  role?:   "org_admin" | "org_user"; // Required if action = 'change_role'
}

export interface ManageMemberResult {
  org_id:  string;
  user_id: string;
  action:  string;
  status:  string;
}
