/**
 * ticket/efn-ticket-dashboard/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const TicketDashboardSchema = z.object({
  org_id: uuidSchema.optional(),
});

export type TicketDashboardInput = z.infer<typeof TicketDashboardSchema>;
