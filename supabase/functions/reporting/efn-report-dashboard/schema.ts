/**
 * reporting/efn-report-dashboard/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const DashboardSchema = z.object({
  org_id:         uuidSchema.optional(),
  vendor_id:      uuidSchema.optional(),
  dashboard_type: z.enum(["org_executive", "vendor_performance", "system_admin", "maintenance_dashboard", "inventory_dashboard"]),
  reporting_date: z.string().date().optional(), // Expected format YYYY-MM-DD
});

export type DashboardInput = z.infer<typeof DashboardSchema>;
