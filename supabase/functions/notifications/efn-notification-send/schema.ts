/**
 * notifications/efn-notification-send/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const NotificationSendSchema = z.object({
  action:        z.literal("send_notification"),
  recipient_id:  uuidSchema,
  template_code: z.string(),
  variables:     z.record(z.string()).optional(),
  payload:       z.record(z.any()).optional(),
  priority:      z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  scheduled_at:  z.string().datetime().optional(), // For delayed delivery
});

export type NotificationSendInput = z.infer<typeof NotificationSendSchema>;
