/**
 * vendor/efn-vendor-members/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const ManageVendorMemberSchema = z.object({
  vendor_id: uuidSchema,
  user_id:   uuidSchema,
  action:    z.enum(["remove", "suspend", "reactivate", "change_role"]),
  role:      z.enum(["vendor_admin", "vendor_staff", "technician"]).optional(),
}).refine(
  (d) => d.action !== "change_role" || !!d.role,
  { message: "Role is required when action is 'change_role'", path: ["role"] },
);

export type ManageVendorMemberInput = z.infer<typeof ManageVendorMemberSchema>;
