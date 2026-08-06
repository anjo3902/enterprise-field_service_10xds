/**
 * organization/efn-org-members/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const ManageMemberSchema = z.object({
  org_id:  uuidSchema,
  user_id: uuidSchema,
  action:  z.enum(["remove", "suspend", "reactivate", "change_role"]),
  role:    z.enum(["org_admin", "org_user"]).optional(),
}).refine(
  (d) => d.action !== "change_role" || !!d.role,
  { message: "Role is required when action is 'change_role'", path: ["role"] }
);

export type ManageMemberInput = z.infer<typeof ManageMemberSchema>;
