/**
 * notifications/efn-notification-email/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const EmailDeliverySchema = z.object({
  action:          z.literal("deliver_email"),
  notification_id: uuidSchema,
});

export type EmailDeliveryInput = z.infer<typeof EmailDeliverySchema>;
