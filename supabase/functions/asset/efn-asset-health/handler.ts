/**
 * asset/efn-asset-health/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Retrieves the current health profile of an asset.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { GetAssetHealthResult } from "./types.ts";
import type { GetAssetHealthInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-asset-health";

export async function getAssetHealth(
  body:          GetAssetHealthInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<GetAssetHealthResult> {
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
      throw new ForbiddenError("Cannot view health for an asset outside your organization", correlationId);
    }
    if (claims.vendor_id && claims.vendor_id !== a["vendor_id"]) {
      throw new ForbiddenError("Your vendor is not assigned to this asset", correlationId);
    }
  }

  // ── 3. Query Health Profile ───────────────────────────────────────
  const { data: health, error: healthErr } = await db
    .from("healthscores")
    .select("*")
    .eq("asset_id", a["asset_id"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (healthErr) throw new Error(`Health query failed: ${healthErr.message}`);

  const h = (health as Record<string, unknown> | null) ?? {
    score: 100,
    health_status: "Healthy",
    failure_risk: "Low",
    failure_risk_pct: 0,
    detected_issues: [],
    recommended_actions: [],
    trend: [],
    created_at: new Date().toISOString(),
  };

  log.info({ correlationId, asset_id: body.asset_id_pk }, "Asset health fetched");

  return {
    asset_id_pk:      body.asset_id_pk,
    health_score:     (h["score"] as number),
    health_status:    (h["health_status"] as string),
    failure_risk:     (h["failure_risk"] as string | null),
    failure_risk_pct: (h["failure_risk_pct"] as number | null),
    detected_issues:  (h["detected_issues"] as string[]) ?? [],
    recommended_actions: (h["recommended_actions"] as string[]) ?? [],
    trend:            (h["trend"] as number[]) ?? [],
    last_updated_at:  (h["created_at"] as string),
  };
}
