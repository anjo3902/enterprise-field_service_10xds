/**
 * organization/efn-org-license/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const GetLicenseSchema = z.object({
  org_id: uuidSchema,
});

export type GetLicenseInput = z.infer<typeof GetLicenseSchema>;
