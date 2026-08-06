/**
 * ticket/efn-ticket-history/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const TicketHistorySchema = z.object({
  ticket_id: uuidSchema,
  include:   z.array(z.enum(["status", "assignments", "comments"])).default(["status", "assignments", "comments"]),
  limit:     z.number().int().min(1).max(100).default(50),
});

export type TicketHistoryInput = z.infer<typeof TicketHistorySchema>;
