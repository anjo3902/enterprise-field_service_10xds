/**
 * notifications/efn-notification-sms/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const SmsDeliverySchema = z.object({
  action:          z.literal("deliver_sms"),
  notification_id: uuidSchema,
});

export type SmsDeliveryInput = z.infer<typeof SmsDeliverySchema>;
