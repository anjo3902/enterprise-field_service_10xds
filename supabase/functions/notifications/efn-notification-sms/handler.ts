/**
 * notifications/efn-notification-sms/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles processing and delivery of SMS via Provider abstraction.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { SmsDeliveryResult } from "./types.ts";
import type { SmsDeliveryInput } from "./schema.ts";
import { sendSms } from "../../shared/notifications/provider.ts";

const FUNCTION_NAME = "efn-notification-sms";

export async function handleSmsDelivery(
  body:          SmsDeliveryInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<SmsDeliveryResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // Fetch the notification instance
  const { data: notification } = await db.from("notifications")
    .select("*, profiles(phone_number)")
    .eq("id", body.notification_id)
    .maybeSingle();

  if (!notification) throw new NotFoundError("Notification", correlationId);

  const recipientPhone = notification.profiles?.phone_number;
  if (!recipientPhone) {
    throw new Error("Recipient does not have a phone number configured");
  }

  // Attempt delivery
  const result = await sendSms({
    to: recipientPhone,
    message: `${notification.title}: ${notification.message}` // SMS usually concatenates or drops title
  });

  const deliveryStatus = result.success ? "delivered" : "failed";

  // Audit delivery outcome
  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: notification.org_id,
    entity_type: "notification", entity_id: notification.id, action: "SMS_DISPATCHED",
    new_value: { status: deliveryStatus, provider_message_id: result.provider_message_id, error: result.error },
    timestamp: now
  });

  if (result.success) {
    await publishEvent({ event_name: "notification.delivered" as never, payload: { notification_id: notification.id, channel: "sms" }, org_id: notification.org_id, correlation_id: correlationId, source_function: FUNCTION_NAME });
  } else {
    await publishEvent({ event_name: "notification.failed" as never, payload: { notification_id: notification.id, channel: "sms", error: result.error }, org_id: notification.org_id, correlation_id: correlationId, source_function: FUNCTION_NAME });
  }

  log.info({ correlationId, notification_id: notification.id, status: deliveryStatus }, "SMS delivery processed");

  return {
    action: "deliver_sms",
    notification_id: notification.id,
    provider_message_id: result.provider_message_id,
    status: deliveryStatus
  };
}
