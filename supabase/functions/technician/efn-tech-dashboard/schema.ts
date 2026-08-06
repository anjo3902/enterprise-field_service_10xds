/**
 * technician/efn-tech-dashboard/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const TechDashboardSchema = z.object({
  technician_id: uuidSchema,
});

export type TechDashboardInput = z.infer<typeof TechDashboardSchema>;
