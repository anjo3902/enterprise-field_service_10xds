/**
 * auth/efn-auth-profile-sync/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Synchronizes the `profiles` table when a new auth.users row is inserted.
 *
 * The DB trigger `trg_auth_user_created` creates a minimal profile stub.
 * This Edge Function enriches that stub with:
 *   - full_name, first_name, last_name from raw_user_meta_data
 *   - role from raw_user_meta_data (set during invite flow)
 *   - org_id / vendor_id from raw_app_meta_data
 *   - notification_preferences defaults
 *
 * Idempotency: Uses UPSERT so re-processing the same webhook is safe.
 * Writes:      audit_logs, activity_timeline, platform_events
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { EVENTS }       from "../../shared/events/event-types.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import type { AuthUserRecord, ProfileSyncResult } from "./types.ts";

const FUNCTION_NAME = "efn-auth-profile-sync";

export async function syncProfile(
  user:          AuthUserRecord,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<ProfileSyncResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Check if profile already fully synced ──────────────────────
  const { data: existing } = await db
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  // If the profile was already synced (has full_name set), skip enrichment
  if (existing?.full_name) {
    log.info({ correlationId, user_id: user.id }, "Profile already synced — skipping");
    return { profile_id: user.id, action: "already_exists" };
  }

  // ── 2. Extract metadata from raw_user_meta_data ───────────────────
  const meta     = user.raw_user_meta_data;
  const appMeta  = user.raw_app_meta_data;

  const firstName    = (meta["first_name"] as string | undefined) ?? "";
  const lastName     = (meta["last_name"]  as string | undefined) ?? "";
  const fullName     = (meta["full_name"]  as string | undefined)
                       ?? [firstName, lastName].filter(Boolean).join(" ")
                       || null;

  const role         = (meta["role"]     as string | undefined) ?? "org_user";
  const orgId        = (appMeta["org_id"]    as string | null) ?? null;
  const vendorId     = (appMeta["vendor_id"] as string | null) ?? null;

  const tenantType   = orgId
    ? "org"
    : vendorId
    ? "vendor"
    : "system";

  const defaultNotifPrefs = {
    push:     true,
    email:    true,
    sms:      false,
    in_app:   true,
  };

  // ── 3. Upsert profile ─────────────────────────────────────────────
  const { error: upsertErr } = await db
    .from("profiles")
    .upsert(
      {
        id:                    user.id,
        email:                 user.email ?? "",
        role,
        first_name:            firstName  || null,
        last_name:             lastName   || null,
        full_name:             fullName,
        org_id:                orgId,
        vendor_id:             vendorId,
        assigned_entity_id:    orgId ?? vendorId ?? null,
        assigned_entity_type:  tenantType,
        status:                "active",
        notification_preferences: defaultNotifPrefs,
        updated_at:            nowUtc(),
      },
      { onConflict: "id" },
    );

  if (upsertErr) {
    log.error({ correlationId, user_id: user.id, error: upsertErr.message }, "Profile upsert failed");
    throw new Error(`Profile upsert failed: ${upsertErr.message}`);
  }

  // ── 4. Write audit log ────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    null,                     // System-initiated
    actor_role:  "system",
    org_id:      orgId,
    vendor_id:   vendorId,
    entity_type: "profile",
    entity_id:   user.id,
    action:      "PROFILE_CREATED",
    new_value:   { email: user.email, role, org_id: orgId, vendor_id: vendorId },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   nowUtc(),
  });

  // ── 5. Write activity timeline ────────────────────────────────────
  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "profile",
    entity_id:        user.id,
    activity_type:    "account_created",
    description:      `Account created for ${user.email ?? "unknown"}`,
    performed_by_id:  null,
    role:             "system",
    metadata:         { correlation_id: correlationId },
    occurred_at:      nowUtc(),
  });

  // ── 6. Publish platform event ─────────────────────────────────────
  await publishEvent({
    event_name:      EVENTS.USER_PROFILE_CREATED,
    payload:         { profile_id: user.id, email: user.email, role, org_id: orgId, vendor_id: vendorId },
    org_id:          orgId,
    vendor_id:       vendorId,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, user_id: user.id, role, tenantType }, "Profile sync completed");
  return { profile_id: user.id, action: "created" };
}
