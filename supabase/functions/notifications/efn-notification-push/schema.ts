/**
 * notifications/efn-notification-push/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema } from "../../shared/validation/common-validators.ts";

export const PushDeliverySchema = z.object({
  action:          z.literal("deliver_push"),
  notification_id: uuidSchema,
});

export type PushDeliveryInput = z.infer<typeof PushDeliverySchema>;
