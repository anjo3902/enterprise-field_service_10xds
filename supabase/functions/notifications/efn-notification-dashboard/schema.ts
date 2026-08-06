/**
 * notifications/efn-notification-dashboard/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const DashboardSchema = z.object({
  org_id: uuidSchema.optional(),
});

export type DashboardInput = z.infer<typeof DashboardSchema>;
