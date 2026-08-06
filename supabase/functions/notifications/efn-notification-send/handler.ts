/**
 * notifications/efn-notification-send/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Main orchestrator for generating notifications based on user preferences.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { NotificationSendResult } from "./types.ts";
import type { NotificationSendInput } from "./schema.ts";

const FUNCTION_NAME = "efn-notification-send";

export async function handleNotificationSend(
  body:          NotificationSendInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<NotificationSendResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // Get recipient profile & prefs
  const { data: recipient } = await db.from("profiles")
    .select("id, organization_members(org_id), vendor_members(vendor_id), notification_preferences(*)")
    .eq("id", body.recipient_id)
    .maybeSingle();

  if (!recipient) throw new NotFoundError("Recipient Profile", correlationId);

  const prefs = recipient.notification_preferences?.[0] || {
    email_enabled: true, sms_enabled: false, push_enabled: true, in_app_enabled: true
  };

  // Extract context org/vendor for the notification
  const orgId = recipient.organization_members?.[0]?.org_id;
  const vendorId = recipient.vendor_members?.[0]?.vendor_id;

  // Fetch templates for the specified code
  const { data: templates } = await db.from("notification_templates")
    .select("*")
    .eq("template_code", body.template_code)
    .eq("status", "active")
    .is("deleted_at", null);

  if (!templates || templates.length === 0) {
    throw new NotFoundError(`Templates for ${body.template_code}`, correlationId);
  }

  const queuedChannels: string[] = [];

  // Helper to process template variables
  const renderTemplate = (text: string, vars?: Record<string, string>) => {
    let result = text;
    if (vars) {
      for (const [key, val] of Object.entries(vars)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), val);
      }
    }
    return result;
  };

  for (const template of templates) {
    const ch = template.channel;
    
    // Check user preferences
    if (ch === "email" && !prefs.email_enabled) continue;
    if (ch === "sms" && !prefs.sms_enabled) continue;
    if (ch === "push" && !prefs.push_enabled) continue;
    if (ch === "in_app" && !prefs.in_app_enabled) continue;

    const title = renderTemplate(template.subject ?? "", body.variables);
    const message = renderTemplate(template.body, body.variables);
    const notifId = generateUuid();
    const notifNum = `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Note: To simplify the implementation, we use the `notifications` table 
    // as an outbox for all channels, and specific edge functions pick them up, 
    // or we dispatch them directly via Edge Functions internally.
    // For this module, we will write to `notifications` and then trigger an event.

    await db.from("notifications").insert({
      id: notifId,
      notification_number: notifNum,
      recipient_profile_id: recipient.id,
      org_id: orgId,
      vendor_id: vendorId,
      notification_type: body.template_code,
      priority: body.priority,
      title: title,
      message: message,
      payload: body.payload ?? {},
      delivery_status: body.scheduled_at ? "scheduled" : "queued",
      created_at: now
    });

    queuedChannels.push(ch);

    if (!body.scheduled_at) {
      // Fire channel-specific event to be picked up by the respective channel EF
      await publishEvent({ 
        event_name: `notification.send.${ch}` as never, 
        payload: { notification_id: notifId, title, message, payload: body.payload }, 
        org_id: orgId, correlation_id: correlationId, source_function: FUNCTION_NAME 
      });
    }
  }

  await publishEvent({ 
    event_name: "notification.queued" as never, 
    payload: { recipient_id: body.recipient_id, template: body.template_code, channels: queuedChannels }, 
    org_id: orgId, correlation_id: correlationId, source_function: FUNCTION_NAME 
  });

  log.info({ correlationId, recipient_id: body.recipient_id, queuedChannels }, "Notifications queued");

  return {
    action: "send_notification",
    status: body.scheduled_at ? "scheduled" : "queued",
    channels: queuedChannels,
    queued: queuedChannels.length
  };
}
