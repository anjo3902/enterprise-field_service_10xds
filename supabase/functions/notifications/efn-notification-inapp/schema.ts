/**
 * notifications/efn-notification-inapp/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const InAppSchema = z.object({
  action:          z.enum(["mark_read", "get_unread_count"]),
  notification_id: uuidSchema.optional(), // required for mark_read
});

export type InAppInput = z.infer<typeof InAppSchema>;
