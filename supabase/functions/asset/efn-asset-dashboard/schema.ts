/**
 * asset/efn-asset-dashboard/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const AssetDashboardSchema = z.object({
  org_id: uuidSchema.optional(), // Required for platform_admin, otherwise derived
});

export type AssetDashboardInput = z.infer<typeof AssetDashboardSchema>;
