/**
 * asset/efn-asset-import/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles bulk import of assets.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { AssetImportResult } from "./types.ts";
import type { AssetImportInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-asset-import";

export async function importAssets(
  body:          AssetImportInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<AssetImportResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin && claims.org_id !== body.org_id) {
    throw new ForbiddenError("Cannot import assets into a different organization", correlationId);
  }

  const result: AssetImportResult = {
    org_id: body.org_id,
    total_records: body.assets.length,
    imported: 0,
    failed: 0,
    errors: [],
  };

  const assetInserts = [];
  const healthInserts = [];

  // ── 2. Process Batch ──────────────────────────────────────────────
  // (In a real system, we'd do a bulk insert, but we need to generate asset tags.
  // We will prepare the arrays and insert them in chunks if needed, but since max is 500
  // we can do a single bulk insert for assets and healthscores).

  for (let i = 0; i < body.assets.length; i++) {
    const record = body.assets[i];
    try {
      const assetPkId = generateUuid();
      const shortHash = crypto.randomUUID().split("-")[0].toUpperCase().substring(0, 5);
      const assetTag = `AST-${shortHash}`;

      assetInserts.push({
        id:                assetPkId,
        org_id:            body.org_id,
        asset_name:        record.asset_name,
        asset_id:          assetTag,
        category:          record.category,
        vendor_id:         record.vendor_id ?? null,
        site_id:           record.site_id ?? null,
        location:          record.location ?? null,
        installation_date: record.installation_date ?? null,
        warranty_expiry:   record.warranty_expiry ?? null,
        amc_expiry:        record.amc_expiry ?? null,
        purchase_date:     record.purchase_date ?? null,
        status:            record.status,
        health_score:      100,
        health:            "Healthy",
        created_by:        claims.sub,
        created_at:        now,
      });

      healthInserts.push({
        asset_id:         assetTag,
        org_id:           body.org_id,
        vendor_id:        record.vendor_id ?? null,
        score:            100,
        health_status:    "Healthy",
        failure_risk:     "Low",
        failure_risk_pct: 0.0,
        created_at:       now,
      });

      result.imported++;
    } catch (err) {
      result.failed++;
      result.errors.push({ index: i, asset_name: record.asset_name, error: (err as Error).message });
    }
  }

  // ── 3. Bulk Insert ────────────────────────────────────────────────
  if (assetInserts.length > 0) {
    const { error: insertErr } = await db.from("assets").insert(assetInserts);
    if (insertErr) {
      log.error({ err: insertErr.message }, "Bulk asset insert failed");
      throw new Error(`Bulk insert failed: ${insertErr.message}`);
    }

    const { error: healthErr } = await db.from("healthscores").insert(healthInserts);
    if (healthErr) {
      log.error({ err: healthErr.message }, "Bulk healthscores insert failed");
      // Not throwing here, assets were created.
    }
  }

  // ── 4. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      body.org_id,
    entity_type: "asset",
    entity_id:   body.org_id, // using org_id as entity_id for bulk action
    action:      "BULK_IMPORT",
    new_value:   { imported: result.imported, failed: result.failed },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  await publishEvent({
    event_name:      "asset.import.completed" as never,
    payload:         { org_id: body.org_id, imported: result.imported, failed: result.failed },
    org_id:          body.org_id,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, org_id: body.org_id, imported: result.imported }, "Asset import completed");
  return result;
}
