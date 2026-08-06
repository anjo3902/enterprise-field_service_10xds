/**
 * dispatch/efn-dispatch-dashboard/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const DispatchDashboardSchema = z.object({
  org_id:       uuidSchema.optional(),
  vendor_id:    uuidSchema.optional(),
  period_start: z.string().datetime({ offset: true }).optional(),
  period_end:   z.string().datetime({ offset: true }).optional(),
});

export type DispatchDashboardInput = z.infer<typeof DispatchDashboardSchema>;
