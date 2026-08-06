/**
 * notifications/efn-notification-inapp/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles In-App notification read state and unread counts.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ValidationError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { InAppResult } from "./types.ts";
import type { InAppInput } from "./schema.ts";

const FUNCTION_NAME = "efn-notification-inapp";

export async function handleInApp(
  body:          InAppInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<InAppResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  if (body.action === "get_unread_count") {
    const { count, error } = await db.from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_profile_id", claims.sub)
      .eq("is_read", false)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    log.info({ correlationId, count }, "Unread count retrieved");
    return { action: "get_unread_count", count: count ?? 0, status: "success" };

  } else if (body.action === "mark_read") {
    if (!body.notification_id) throw new ValidationError("notification_id is required", correlationId);

    const { data: notification } = await db.from("notifications")
      .select("id, recipient_profile_id")
      .eq("id", body.notification_id)
      .maybeSingle();

    if (!notification) throw new NotFoundError("Notification", correlationId);
    
    // Only the recipient can mark their notification as read
    if (notification.recipient_profile_id !== claims.sub) {
      throw new Error("Unauthorized to mark this notification as read");
    }

    await db.from("notifications").update({ is_read: true, read_at: now }).eq("id", body.notification_id);

    await publishEvent({ event_name: "notification.read" as never, payload: { notification_id: body.notification_id }, org_id: null as any, correlation_id: correlationId, source_function: FUNCTION_NAME });

    log.info({ correlationId, notification_id: body.notification_id }, "Notification marked as read");
    return { action: "mark_read", status: "success" };
  }

  throw new Error("Invalid action");
}
