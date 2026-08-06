/**
 * inventory/efn-inventory-search/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles global paginated search for inventory items across warehouses.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { InventorySearchResult } from "./types.ts";
import type { InventorySearchInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-inventory-search";

export async function searchInventory(
  body:          InventorySearchInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<InventorySearchResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // 1. Fetch Warehouses in Scope
  let whQuery = db.from("warehouses").select("id, name").is("deleted_at", null);
  if (!claims.is_platform_admin) {
    if (claims.org_id) whQuery = whQuery.eq("org_id", claims.org_id);
    if (claims.vendor_id) whQuery = whQuery.eq("vendor_id", claims.vendor_id);
  }
  if (body.warehouse_id) whQuery = whQuery.eq("id", body.warehouse_id);

  const { data: whRows } = await whQuery;
  const whList = (whRows ?? []) as { id: string; name: string }[];
  if (whList.length === 0) {
    return { data: [], total: 0, limit: body.limit!, offset: body.offset! };
  }

  const whIds = whList.map(w => w.id);
  const whNameMap = new Map(whList.map(w => [w.id, w.name]));

  // 2. Search Items Table
  let itemQuery = db.from("inventory_items").select("id, item_code, name, category, barcode, qr_code").is("deleted_at", null);

  if (body.category) itemQuery = itemQuery.eq("category", body.category);

  if (body.query) {
    // Basic text search across fields
    const q = body.query;
    itemQuery = itemQuery.or(`name.ilike.%${q}%,item_code.ilike.%${q}%,barcode.ilike.%${q}%,qr_code.ilike.%${q}%`);
  }

  const { data: itemRows } = await itemQuery;
  const items = (itemRows ?? []) as { id: string; item_code: string; name: string; category: string; barcode: string | null; qr_code: string | null }[];
  if (items.length === 0) {
    return { data: [], total: 0, limit: body.limit!, offset: body.offset! };
  }

  const itemIds = items.map(i => i.id);
  const itemMap = new Map(items.map(i => [i.id, i]));

  // 3. Query Warehouse Stock for those items and warehouses
  let stockQuery = db.from("warehouse_stock")
    .select("id, inventory_item_id, warehouse_id, current_quantity, available_quantity", { count: "exact" })
    .in("warehouse_id", whIds)
    .in("inventory_item_id", itemIds)
    .is("deleted_at", null);

  if (body.in_stock) stockQuery = stockQuery.gt("current_quantity", 0);

  // Sorting at DB level if on stock quantity, else we sort in memory for this MVP
  if (body.sort_by === "current_quantity") {
    stockQuery = stockQuery.order("current_quantity", { ascending: body.sort_dir === "asc" });
  }

  const { data: stockRows, count } = await stockQuery.range(body.offset!, body.offset! + body.limit! - 1);
  const stocks = (stockRows ?? []) as { inventory_item_id: string; warehouse_id: string; current_quantity: number; available_quantity: number }[];

  const results = stocks.map(st => {
    const it = itemMap.get(st.inventory_item_id)!;
    return {
      id:                 it.id,
      item_code:          it.item_code,
      name:               it.name,
      category:           it.category,
      barcode:            it.barcode,
      qr_code:            it.qr_code,
      current_quantity:   st.current_quantity,
      available_quantity: st.available_quantity,
      warehouse_id:       st.warehouse_id,
      warehouse_name:     whNameMap.get(st.warehouse_id)!,
    };
  });

  // Memory Sort if not sorted by quantity
  if (body.sort_by !== "current_quantity") {
    results.sort((a, b) => {
      let valA = a.name, valB = b.name;
      if (body.sort_by === "item_code") { valA = a.item_code; valB = b.item_code; }
      if (valA < valB) return body.sort_dir === "asc" ? -1 : 1;
      if (valA > valB) return body.sort_dir === "asc" ? 1 : -1;
      return 0;
    });
  }

  log.info({ correlationId, total: count, limit: body.limit }, "Inventory search executed");

  return {
    data: results,
    total: count ?? 0,
    limit: body.limit!,
    offset: body.offset!,
  };
}
