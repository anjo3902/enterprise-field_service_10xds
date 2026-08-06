/**
 * ticket/efn-ticket-watchers/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const WatcherActionSchema = z.object({
  action:             z.enum(["add", "remove"]),
  ticket_id:          uuidSchema,
  profile_id:         uuidSchema,
  notification_prefs: z.record(z.boolean()).optional(), // e.g. { status_changes: true, comments: false }
});

export type WatcherActionInput = z.infer<typeof WatcherActionSchema>;
