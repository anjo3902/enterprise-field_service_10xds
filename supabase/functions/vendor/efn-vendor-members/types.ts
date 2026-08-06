/**
 * vendor/efn-vendor-members/types.ts
 */

export interface ManageVendorMemberInput {
  vendor_id: string;
  user_id:   string;
  action:    "remove" | "suspend" | "reactivate" | "change_role";
  role?:     "vendor_admin" | "vendor_staff" | "technician";
}

export interface ManageVendorMemberResult {
  vendor_id:  string;
  user_id:    string;
  action:     string;
  new_status: string;
}
