/**
 * notifications/efn-notification-push/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles processing and delivery of Push Notifications via Provider abstraction.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { PushDeliveryResult } from "./types.ts";
import type { PushDeliveryInput } from "./schema.ts";
import { sendPush } from "../../shared/notifications/provider.ts";

const FUNCTION_NAME = "efn-notification-push";

export async function handlePushDelivery(
  body:          PushDeliveryInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<PushDeliveryResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // Fetch the notification instance
  const { data: notification } = await db.from("notifications")
    .select("*, profiles(id)") // Typically we'd join a devices/tokens table. For demo, we mock token from profile ID
    .eq("id", body.notification_id)
    .maybeSingle();

  if (!notification) throw new NotFoundError("Notification", correlationId);

  const deviceToken = notification.profiles?.id ? `device-${notification.profiles.id}` : null;
  if (!deviceToken) {
    throw new Error("Recipient does not have a registered device token");
  }

  // Attempt delivery
  const result = await sendPush({
    device_token: deviceToken,
    title: notification.title,
    body: notification.message
  });

  const deliveryStatus = result.success ? "delivered" : "failed";

  // Audit delivery outcome
  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: notification.org_id,
    entity_type: "notification", entity_id: notification.id, action: "PUSH_DISPATCHED",
    new_value: { status: deliveryStatus, provider_message_id: result.provider_message_id, error: result.error },
    timestamp: now
  });

  if (result.success) {
    await publishEvent({ event_name: "notification.delivered" as never, payload: { notification_id: notification.id, channel: "push" }, org_id: notification.org_id, correlation_id: correlationId, source_function: FUNCTION_NAME });
  } else {
    await publishEvent({ event_name: "notification.failed" as never, payload: { notification_id: notification.id, channel: "push", error: result.error }, org_id: notification.org_id, correlation_id: correlationId, source_function: FUNCTION_NAME });
  }

  log.info({ correlationId, notification_id: notification.id, status: deliveryStatus }, "Push delivery processed");

  return {
    action: "deliver_push",
    notification_id: notification.id,
    provider_message_id: result.provider_message_id,
    status: deliveryStatus
  };
}
