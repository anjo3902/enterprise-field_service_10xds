/**
 * asset/efn-asset-search/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Global/Scoped asset search with FTS and filters.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { AssetSearchResult } from "./types.ts";
import type { AssetSearchInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-asset-search";

export async function searchAssets(
  body:          AssetSearchInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<AssetSearchResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Access Control / Scoping ───────────────────────────────────
  let targetOrgId = body.org_id;

  if (!claims.is_platform_admin) {
    if (claims.org_id) {
      if (body.org_id && body.org_id !== claims.org_id) {
        throw new ForbiddenError("Cannot search assets outside your organization", correlationId);
      }
      targetOrgId = claims.org_id;
    } else {
      // Vendor or Technician
      targetOrgId = undefined; // Will rely on vendor_id filter
    }
  }

  // ── 2. Query Builder ──────────────────────────────────────────────
  let query = db
    .from("assets")
    .select("id, asset_id, asset_name, category, location, status, health, health_score", { count: "exact" })
    .is("deleted_at", null);

  if (targetOrgId) {
    query = query.eq("org_id", targetOrgId);
  }

  if (claims.vendor_id) {
    query = query.eq("vendor_id", claims.vendor_id);
  } else if (body.vendor_id) {
    query = query.eq("vendor_id", body.vendor_id);
  }

  if (body.site_id)  query = query.eq("site_id", body.site_id);
  if (body.category) query = query.eq("category", body.category);
  if (body.status)   query = query.eq("status", body.status);

  if (body.search_term) {
    // FTS against generated search_vector
    // For partial matches, we could format the term: `term:*`
    const term = body.search_term.trim().split(" ").map(t => `${t}:*`).join(" & ");
    query = query.textSearch("search_vector", term);
  }

  query = query.order("created_at", { ascending: false })
               .range(body.offset!, body.offset! + body.limit! - 1);

  // ── 3. Execute ────────────────────────────────────────────────────
  const { data, count, error } = await query;
  if (error) throw new Error(`Search failed: ${error.message}`);

  log.info({ correlationId, results: data?.length, total: count }, "Asset search executed");

  return {
    data: (data ?? []).map((a: Record<string, unknown>) => ({
      id:           a["id"] as string,
      asset_id:     a["asset_id"] as string,
      asset_name:   a["asset_name"] as string,
      category:     a["category"] as string,
      location:     a["location"] as string | null,
      status:       a["status"] as string,
      health:       a["health"] as string,
      health_score: a["health_score"] as number,
    })),
    total:  count ?? 0,
    limit:  body.limit!,
    offset: body.offset!,
  };
}
