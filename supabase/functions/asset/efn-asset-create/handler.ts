/**
 * asset/efn-asset-create/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Creates a new Asset entity.
 *
 * This inserts into `assets` and initializes its health score and analytics snapshots.
 * Generates an asset tag (AST-XXXX).
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { CreateAssetResult } from "./types.ts";
import type { CreateAssetInput } from "./schema.ts";

const FUNCTION_NAME = "efn-asset-create";

export async function createAsset(
  body:          CreateAssetInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<CreateAssetResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin && claims.org_id !== body.org_id) {
    throw new ForbiddenError("Cannot create an asset for a different organization", correlationId);
  }

  // ── 2. Generate Asset ID (Tag) ────────────────────────────────────
  // In a real system, you might use a sequence. Here we use a random suffix for simplicity,
  // or a DB function. We'll use a random 6-char hex string to ensure uniqueness without locking.
  const shortHash = crypto.randomUUID().split("-")[0].toUpperCase().substring(0, 5);
  const assetTag = `AST-${shortHash}`;

  // ── 3. Insert Asset ───────────────────────────────────────────────
  const assetPkId = generateUuid();
  
  const { error: insertErr } = await db.from("assets").insert({
    id:                assetPkId,
    org_id:            body.org_id,
    asset_name:        body.asset_name,
    asset_id:          assetTag,
    category:          body.category,
    vendor_id:         body.vendor_id ?? null,
    site_id:           body.site_id ?? null,
    location:          body.location ?? null,
    installation_date: body.installation_date ?? null,
    warranty_expiry:   body.warranty_expiry ?? null,
    amc_expiry:        body.amc_expiry ?? null,
    purchase_date:     body.purchase_date ?? null,
    status:            body.status,
    notes:             body.notes ?? null,
    metadata:          body.metadata ?? {},
    health_score:      100, // Initial health is perfect
    health:            "Healthy",
    created_by:        claims.sub,
    created_at:        now,
  });

  if (insertErr) throw new Error(`Asset insert failed: ${insertErr.message}`);

  // ── 4. Initialize Health Snapshot ─────────────────────────────────
  // Using healthscores table from legacy schema
  await db.from("healthscores").insert({
    asset_id:         assetTag,
    org_id:           body.org_id,
    vendor_id:        body.vendor_id ?? null,
    score:            100,
    health_status:    "Healthy",
    failure_risk:     "Low",
    failure_risk_pct: 0.0,
    created_at:       now,
  });

  // ── 5. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      body.org_id,
    vendor_id:   body.vendor_id ?? null,
    entity_type: "asset",
    entity_id:   assetPkId,
    action:      "CREATE",
    new_value:   { asset_name: body.asset_name, asset_id: assetTag, category: body.category },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "asset",
    entity_id:        assetPkId,
    activity_type:    "asset_created",
    description:      `Asset ${assetTag} (${body.asset_name}) created`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { asset_id: assetTag, correlation_id: correlationId },
    occurred_at:      now,
  });

  await publishEvent({
    event_name:      "asset.created" as never,
    payload:         { asset_id_pk: assetPkId, asset_tag: assetTag, org_id: body.org_id },
    org_id:          body.org_id,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, assetPkId, assetTag, org_id: body.org_id }, "Asset created");
  return { asset_id_pk: assetPkId, asset_id: assetTag, org_id: body.org_id, status: body.status ?? "Active", created_at: now };
}
