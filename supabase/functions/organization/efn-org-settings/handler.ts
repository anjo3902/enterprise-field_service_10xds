/**
 * organization/efn-org-settings/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Updates organization settings (business hours and holiday calendar).
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { UpdateSettingsResult } from "./types.ts";
import type { UpdateOrgSettingsInput } from "./schema.ts";

const FUNCTION_NAME = "efn-org-settings";

export async function updateOrgSettings(
  body:          UpdateOrgSettingsInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<UpdateSettingsResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Tenant Isolation ───────────────────────────────────────────
  if (!claims.is_platform_admin && claims.org_id !== body.org_id) {
    throw new ForbiddenError("Cannot update settings for a different organization", correlationId);
  }

  const now = nowUtc();
  const changedFields: string[] = [];
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  // ── 2. Update Business Hours ──────────────────────────────────────
  if (body.business_hours) {
    // Check if business hours exist for this org
    const { data: currentBh } = await db
      .from("business_hours")
      .select("*")
      .eq("org_id", body.org_id)
      .maybeSingle();

    if (currentBh) {
      oldValues.business_hours = currentBh;
      const { error: bhErr } = await db
        .from("business_hours")
        .update({
          ...body.business_hours,
          updated_by: claims.sub,
          updated_at: now,
        })
        .eq("id", (currentBh as any).id);
      
      if (bhErr) throw new Error(`Failed to update business hours: ${bhErr.message}`);
    } else {
      // Org somehow missing business hours (e.g. old data), insert new
      const { error: bhErr } = await db
        .from("business_hours")
        .insert({
          ...body.business_hours,
          id: generateUuid(),
          org_id: body.org_id,
          created_by: claims.sub,
          created_at: now,
        });

      if (bhErr) throw new Error(`Failed to insert business hours: ${bhErr.message}`);
    }

    newValues.business_hours = body.business_hours;
    changedFields.push("business_hours");
  }

  // ── 3. Upsert Holidays ────────────────────────────────────────────
  if (body.holidays && body.holidays.length > 0) {
    const upserts = body.holidays.map(h => ({
      id:           h.id || generateUuid(),
      org_id:       body.org_id,
      holiday_name: h.holiday_name,
      holiday_date: h.holiday_date,
      region:       h.region ?? null,
      is_recurring: h.is_recurring,
      updated_by:   h.id ? claims.sub : undefined,
      created_by:   h.id ? undefined : claims.sub,
      updated_at:   h.id ? now : undefined,
      created_at:   h.id ? undefined : now,
    }));

    const { error: holErr } = await db
      .from("holiday_calendar")
      .upsert(upserts, { onConflict: "id" });

    if (holErr) throw new Error(`Failed to upsert holidays: ${holErr.message}`);

    newValues.holidays = body.holidays;
    changedFields.push("holidays");
  }

  // ── 4. Audit Log ──────────────────────────────────────────────────
  if (changedFields.length > 0) {
    await db.from("audit_logs").insert({
      id:          generateUuid(),
      actor_id:    claims.sub,
      actor_role:  claims.app_role,
      org_id:      body.org_id,
      vendor_id:   null,
      entity_type: "organization_settings",
      entity_id:   body.org_id,
      action:      "UPDATE",
      old_value:   oldValues,
      new_value:   newValues,
      ip_address:  ipAddress ?? null,
      user_agent:  userAgent ?? null,
      timestamp:   now,
    });

    // ── 5. Activity Timeline ──────────────────────────────────────────
    await db.from("activity_timeline").insert({
      id:               generateUuid(),
      entity_type:      "organization",
      entity_id:        body.org_id,
      activity_type:    "organization_settings_updated",
      description:      `Organization settings updated: ${changedFields.join(", ")}`,
      performed_by_id:  claims.sub,
      role:             claims.app_role,
      metadata:         { changed_fields: changedFields, correlation_id: correlationId },
      occurred_at:      now,
    });

    // ── 6. Publish Event ──────────────────────────────────────────────
    await publishEvent({
      event_name:      "organization.settings.updated" as never,
      payload:         { org_id: body.org_id, changed_fields: changedFields },
      org_id:          body.org_id,
      correlation_id:  correlationId,
      source_function: FUNCTION_NAME,
    });
  }

  log.info({ correlationId, org_id: body.org_id, changedFields }, "Organization settings updated");

  return { org_id: body.org_id, updated_at: now };
}
