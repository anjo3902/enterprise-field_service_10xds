/**
 * auth/efn-auth-invite/schema.ts
 * ─────────────────────────────────────────────────────────────────
 * Zod schema for POST /auth/invite request body.
 */

import { z }             from "../../shared/validation/schema-validator.ts";
import { emailSchema, optionalUuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

export const InviteUserSchema = z.object({
  email:      emailSchema,
  role:       z.enum(["org_admin", "org_user", "vendor_admin", "vendor_staff", "technician"]),
  first_name: nonEmptyString.max(100).optional(),
  last_name:  nonEmptyString.max(100).optional(),
  org_id:     optionalUuidSchema,
  vendor_id:  optionalUuidSchema,
  message:    z.string().max(500).optional(),
}).refine(
  (d) => !(d.org_id && d.vendor_id),
  { message: "Cannot specify both org_id and vendor_id", path: ["org_id"] },
).refine(
  (d) => {
    const orgRoles    = ["org_admin", "org_user"];
    const vendorRoles = ["vendor_admin", "vendor_staff", "technician"];
    if (orgRoles.includes(d.role)    && !d.org_id)    return false;
    if (vendorRoles.includes(d.role) && !d.vendor_id) return false;
    return true;
  },
  { message: "org_id required for org roles; vendor_id required for vendor roles", path: ["role"] },
);

export type InviteUserInput = z.infer<typeof InviteUserSchema>;
