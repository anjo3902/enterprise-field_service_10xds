/**
 * asset/efn-asset-history/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Retrieves the history of an asset (manual updates, ticket linkage).
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { GetAssetHistoryResult } from "./types.ts";
import type { GetAssetHistoryInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-asset-history";

export async function getAssetHistory(
  body:          GetAssetHistoryInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<GetAssetHistoryResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Load Current Asset ─────────────────────────────────────────
  const { data: asset, error: fetchErr } = await db
    .from("assets")
    .select("org_id, asset_id, vendor_id")
    .eq("id", body.asset_id_pk)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !asset) throw new NotFoundError("Asset", correlationId);
  
  const a = asset as Record<string, string | null>;

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== a["org_id"]) {
      throw new ForbiddenError("Cannot view history for an asset outside your organization", correlationId);
    }
    if (claims.vendor_id && claims.vendor_id !== a["vendor_id"]) {
      // NOTE: In a full system, technicians could view if assigned to a work order. 
      // This is simplified to vendor assignment.
      throw new ForbiddenError("Your vendor is not assigned to this asset", correlationId);
    }
  }

  // ── 3. Query History ──────────────────────────────────────────────
  const { data: history, error: histErr } = await db
    .from("asset_history")
    .select("id, activity_date, notes, status, vendor_id, performed_by_id")
    .eq("org_id", a["org_id"])
    .eq("asset_id", a["asset_id"]) // asset_history uses the display tag (asset_id) per legacy schema
    .order("activity_date", { ascending: false })
    .limit(body.limit!);

  if (histErr) throw new Error(`History query failed: ${histErr.message}`);

  log.info({ correlationId, asset_id: body.asset_id_pk, count: (history ?? []).length }, "Asset history fetched");

  return {
    asset_id_pk: body.asset_id_pk,
    history: (history ?? []).map((h: Record<string, unknown>) => ({
      history_id:      h["id"] as string,
      activity_date:   h["activity_date"] as string,
      notes:           (h["notes"] as string | null),
      status:          (h["status"] as string | null),
      vendor_id:       (h["vendor_id"] as string | null),
      performed_by_id: (h["performed_by_id"] as string | null),
    })),
  };
}
