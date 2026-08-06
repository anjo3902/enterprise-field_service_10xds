/**
 * asset/efn-asset-update/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Updates an asset. Generates diff and logs history.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { NotFoundError, ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { UpdateAssetResult } from "./types.ts";
import type { UpdateAssetInput } from "./schema.ts";

const FUNCTION_NAME = "efn-asset-update";

export async function updateAsset(
  body:          UpdateAssetInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<UpdateAssetResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Current Asset ─────────────────────────────────────────
  const { data: current, error: fetchErr } = await db
    .from("assets")
    .select("*")
    .eq("id", body.asset_id_pk)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !current) throw new NotFoundError("Asset", correlationId);
  const orgId = (current as Record<string, string>)["org_id"];

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin && claims.org_id !== orgId) {
    throw new ForbiddenError("Cannot update an asset for a different organization", correlationId);
  }

  // ── 3. Build Diff Patch ───────────────────────────────────────────
  const { asset_id_pk, ...fields } = body;
  const patch: Record<string, unknown> = {};
  const oldValues: Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const currentVal = (current as Record<string, unknown>)[key];
    if (JSON.stringify(currentVal) !== JSON.stringify(value)) {
      patch[key]     = value;
      oldValues[key] = currentVal;
      changedFields.push(key);
    }
  }

  if (changedFields.length === 0) {
    return { asset_id_pk, updated_at: (current as Record<string, string>)["updated_at"], changes: [] };
  }

  patch["updated_by"] = claims.sub;
  patch["updated_at"] = now;

  // ── 4. Update Asset ───────────────────────────────────────────────
  const { error: updateErr } = await db
    .from("assets")
    .update(patch)
    .eq("id", asset_id_pk);

  if (updateErr) throw new Error(`Asset update failed: ${updateErr.message}`);

  // ── 5. Record History (if significant changes) ────────────────────
  // We record manual history if ownership/status/vendor changes
  const historyPatch: string[] = [];
  if (patch["vendor_id"]) historyPatch.push(`Vendor changed from ${oldValues["vendor_id"]} to ${patch["vendor_id"]}`);
  if (patch["site_id"])   historyPatch.push(`Site changed from ${oldValues["site_id"]} to ${patch["site_id"]}`);
  if (patch["status"])    historyPatch.push(`Status changed from ${oldValues["status"]} to ${patch["status"]}`);

  if (historyPatch.length > 0) {
    await db.from("asset_history").insert({
      id:              generateUuid(),
      asset_id:        (current as Record<string, string>)["asset_id"],
      org_id:          orgId,
      activity_date:   now,
      performed_by_id: claims.sub,
      notes:           `Update: ${historyPatch.join("; ")}`,
      status:          (patch["status"] as string) ?? (current as Record<string, string>)["status"],
      vendor_id:       (patch["vendor_id"] as string) ?? (current as Record<string, string>)["vendor_id"],
      created_at:      now,
    });
  }

  // ── 6. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      orgId,
    entity_type: "asset",
    entity_id:   asset_id_pk,
    action:      "UPDATE",
    old_value:   oldValues,
    new_value:   patch,
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "asset",
    entity_id:        asset_id_pk,
    activity_type:    "asset_updated",
    description:      `Asset updated: ${changedFields.join(", ")}`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { asset_id_pk, changed_fields: changedFields, correlation_id: correlationId },
    occurred_at:      now,
  });

  // Decide specific event
  const isMove = patch["site_id"] || patch["location"];
  await publishEvent({
    event_name:      isMove ? ("asset.moved" as never) : ("asset.updated" as never),
    payload:         { asset_id_pk, changed_fields: changedFields },
    org_id:          orgId,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, asset_id_pk, changedFields }, "Asset updated");
  return { asset_id_pk, updated_at: now, changes: changedFields };
}
