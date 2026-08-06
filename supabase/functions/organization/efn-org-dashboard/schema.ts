/**
 * organization/efn-org-dashboard/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, dateOnlySchema } from "../../shared/validation/common-validators.ts";

export const GetDashboardSchema = z.object({
  org_id:         uuidSchema,
  reporting_date: dateOnlySchema.optional(), // Defaults to today
});

export type GetDashboardInput = z.infer<typeof GetDashboardSchema>;
