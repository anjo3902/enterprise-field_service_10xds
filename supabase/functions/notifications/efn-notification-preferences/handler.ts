/**
 * notifications/efn-notification-preferences/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles CRUD operations for user notification preferences.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { PreferenceResult } from "./types.ts";
import type { PreferenceInput } from "./schema.ts";

const FUNCTION_NAME = "efn-notification-preferences";

export async function handlePreferences(
  body:          PreferenceInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<PreferenceResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  if (body.action === "get_preferences") {
    let { data: prefs } = await db.from("notification_preferences").select("*").eq("profile_id", claims.sub).maybeSingle();
    
    // Auto-initialize if not exists
    if (!prefs) {
      const { data: newPrefs, error } = await db.from("notification_preferences").insert({ profile_id: claims.sub, created_at: now }).select().single();
      if (error) throw new Error(error.message);
      prefs = newPrefs;
    }

    return {
      action: "get_preferences", profile_id: claims.sub,
      email_enabled: prefs.email_enabled, sms_enabled: prefs.sms_enabled, push_enabled: prefs.push_enabled, in_app_enabled: prefs.in_app_enabled,
      quiet_hours: prefs.quiet_hours, timezone: prefs.timezone, status: "success"
    };

  } else if (body.action === "update_preferences") {
    const updatePayload: any = { updated_at: now };
    if (body.email_enabled !== undefined) updatePayload.email_enabled = body.email_enabled;
    if (body.sms_enabled !== undefined) updatePayload.sms_enabled = body.sms_enabled;
    if (body.push_enabled !== undefined) updatePayload.push_enabled = body.push_enabled;
    if (body.in_app_enabled !== undefined) updatePayload.in_app_enabled = body.in_app_enabled;
    if (body.quiet_hours !== undefined) updatePayload.quiet_hours = body.quiet_hours;
    if (body.timezone !== undefined) updatePayload.timezone = body.timezone;

    // Upsert
    const { data: prefs, error } = await db.from("notification_preferences").upsert({
      profile_id: claims.sub, ...updatePayload
    }, { onConflict: 'profile_id' }).select().single();

    if (error) throw new Error(error.message);

    await publishEvent({ event_name: "notification.preference.updated" as never, payload: { profile_id: claims.sub }, org_id: null as any, correlation_id: correlationId, source_function: FUNCTION_NAME });

    log.info({ correlationId, profile_id: claims.sub }, "Notification preferences updated");
    
    return {
      action: "update_preferences", profile_id: claims.sub,
      email_enabled: prefs.email_enabled, sms_enabled: prefs.sms_enabled, push_enabled: prefs.push_enabled, in_app_enabled: prefs.in_app_enabled,
      quiet_hours: prefs.quiet_hours, timezone: prefs.timezone, status: "success"
    };
  }

  throw new Error("Invalid action");
}
