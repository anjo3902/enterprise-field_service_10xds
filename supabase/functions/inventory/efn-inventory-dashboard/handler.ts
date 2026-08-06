/**
 * inventory/efn-inventory-dashboard/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Generates an aggregated inventory analytics dashboard.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { InventoryDashboardResult } from "./types.ts";
import type { InventoryDashboardInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-inventory-dashboard";

export async function getInventoryDashboard(
  body:          InventoryDashboardInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<InventoryDashboardResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // 1. Scope
  let orgScope:    string | null = body.org_id ?? null;
  let vendorScope: string | null = body.vendor_id ?? null;

  if (!claims.is_platform_admin) {
    if (claims.org_id) {
      if (body.org_id && body.org_id !== claims.org_id) throw new ForbiddenError("Cannot view dashboard for a different organization", correlationId);
      orgScope = claims.org_id;
    }
    if (claims.vendor_id) vendorScope = claims.vendor_id;
    if (!orgScope && !vendorScope) throw new ForbiddenError("No scope available", correlationId);
  }

  // 2. Fetch Warehouses
  let whQuery = db.from("warehouses").select("id, name").is("deleted_at", null);
  if (orgScope) whQuery = whQuery.eq("org_id", orgScope);
  if (vendorScope) whQuery = whQuery.eq("vendor_id", vendorScope);
  const { data: whRows } = await whQuery;
  const whList = (whRows ?? []) as { id: string; name: string }[];
  const whIds = whList.map(w => w.id);

  if (whIds.length === 0) {
    return {
      org_id: orgScope ?? vendorScope ?? "",
      summary: { total_items: 0, total_stock_value: 0, low_stock_items: 0, out_of_stock_items: 0 },
      warehouse_metrics: [],
      recent_movements: { receipts: 0, issues: 0, transfers: 0, consumptions: 0 }
    };
  }

  // 3. Fetch Stock
  const { data: stockRows } = await db.from("warehouse_stock")
    .select("warehouse_id, inventory_item_id, current_quantity, stock_value")
    .in("warehouse_id", whIds)
    .is("deleted_at", null);

  const stocks = (stockRows ?? []) as { warehouse_id: string; inventory_item_id: string; current_quantity: number; stock_value: number }[];

  // 4. Fetch Master Items to evaluate min_stock
  const itemIds = [...new Set(stocks.map(s => s.inventory_item_id))];
  const { data: itemsRows } = await db.from("inventory_items").select("id, minimum_stock").in("id", itemIds).is("deleted_at", null);
  const itemMins = new Map((itemsRows ?? []).map((i: any) => [i.id, i.minimum_stock]));

  let totalValue = 0;
  let outOfStock = 0;
  let lowStock   = 0;
  const whMap = new Map<string, { value: number; count: number }>();

  for (const st of stocks) {
    totalValue += st.stock_value;
    const min = itemMins.get(st.inventory_item_id) ?? 0;
    if (st.current_quantity === 0) outOfStock++;
    else if (st.current_quantity <= min) lowStock++;

    const whData = whMap.get(st.warehouse_id) ?? { value: 0, count: 0 };
    whData.value += st.stock_value;
    whData.count++;
    whMap.set(st.warehouse_id, whData);
  }

  // 5. Fetch Recent Movements (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: moves } = await db.from("stock_movements")
    .select("movement_type")
    .in("warehouse_id", whIds)
    .gte("movement_date", thirtyDaysAgo);

  const moveCounts = { receipts: 0, issues: 0, transfers: 0, consumptions: 0 };
  for (const m of (moves ?? [])) {
    const type = m.movement_type;
    if (type === "receipt") moveCounts.receipts++;
    else if (type === "issue") moveCounts.issues++;
    else if (type === "transfer") moveCounts.transfers++;
    else if (type === "consumption") moveCounts.consumptions++;
  }

  log.info({ correlationId, whCount: whIds.length }, "Inventory dashboard computed");

  return {
    org_id: orgScope ?? vendorScope ?? "",
    summary: {
      total_items: itemIds.length,
      total_stock_value: totalValue,
      low_stock_items: lowStock,
      out_of_stock_items: outOfStock,
    },
    warehouse_metrics: whList.map(w => ({
      warehouse_id: w.id,
      warehouse_name: w.name,
      total_value: whMap.get(w.id)?.value ?? 0,
      items_count: whMap.get(w.id)?.count ?? 0,
    })),
    recent_movements: moveCounts,
  };
}
