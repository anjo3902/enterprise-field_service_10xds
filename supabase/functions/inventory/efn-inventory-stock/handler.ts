/**
 * inventory/efn-inventory-stock/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles viewing and reconciling stock in a specific warehouse.
 * Reconciliation calculates the delta and inserts a stock_movement.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError, ConflictError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { StockResult } from "./types.ts";
import type { InventoryStockInput } from "./schema.ts";

const FUNCTION_NAME = "efn-inventory-stock";

export async function handleInventoryStock(
  body:          InventoryStockInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<StockResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Fetch Warehouse & Stock ────────────────────────────────────
  const { data: wh } = await db.from("warehouses").select("org_id, vendor_id").eq("id", body.warehouse_id).is("deleted_at", null).maybeSingle();
  if (!wh) throw new NotFoundError("Warehouse", correlationId);
  const w = wh as Record<string, string | null>;

  if (!claims.is_platform_admin) {
    if (claims.org_id && w["org_id"] !== claims.org_id) throw new ForbiddenError("Warehouse does not belong to your organization", correlationId);
    if (claims.vendor_id && w["vendor_id"] !== claims.vendor_id) throw new ForbiddenError("Warehouse does not belong to your vendor profile", correlationId);
  }

  // Ensure row exists, or initialize it
  const { data: existingStock, error: esErr } = await db.from("warehouse_stock")
    .select("*")
    .eq("warehouse_id", body.warehouse_id)
    .eq("inventory_item_id", body.inventory_item_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (esErr) throw new Error(esErr.message);

  let currentStock = existingStock as Record<string, unknown> | null;

  if (!currentStock && body.action === "get") {
    return {
      warehouse_id: body.warehouse_id, inventory_item_id: body.inventory_item_id,
      current_quantity: 0, reserved_quantity: 0, available_quantity: 0,
      average_cost: 0, stock_value: 0, status: "active"
    };
  }

  // ── 2. Reconcile Action ───────────────────────────────────────────
  if (body.action === "reconcile") {
    if (claims.app_role === "technician" || claims.app_role === "read_only") {
      throw new ForbiddenError("You do not have permission to reconcile stock", correlationId);
    }

    const actualQty = body.actual_quantity!;
    const oldQty = currentStock ? (currentStock["current_quantity"] as number) : 0;
    const reserved = currentStock ? (currentStock["reserved_quantity"] as number) : 0;

    if (actualQty < reserved) {
      throw new ConflictError(`Actual quantity (${actualQty}) cannot be less than currently reserved quantity (${reserved})`, correlationId);
    }

    const delta = actualQty - oldQty;
    if (delta !== 0) {
      // 1. Insert Movement
      await db.from("stock_movements").insert({
        id: generateUuid(),
        inventory_item_id: body.inventory_item_id,
        warehouse_id:      body.warehouse_id,
        movement_type:     "adjustment",
        quantity:          delta,
        reference_type:    "manual",
        performed_by:      claims.sub,
        remarks:           body.reason,
        movement_date:     now,
      });

      // 2. Upsert Stock
      const { data: updated, error: updErr } = await db.from("warehouse_stock").upsert({
        warehouse_id:      body.warehouse_id,
        inventory_item_id: body.inventory_item_id,
        current_quantity:  actualQty,
        // average_cost stays the same on manual adjustment
        updated_at:        now,
      }, { onConflict: "warehouse_id,inventory_item_id" }).select("*").single();

      if (updErr) throw new Error(updErr.message);
      currentStock = updated as Record<string, unknown>;

      await db.from("audit_logs").insert({
        id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: w["org_id"],
        entity_type: "warehouse_stock", entity_id: (currentStock["id"] as string), action: "RECONCILE",
        old_value: { current_quantity: oldQty }, new_value: { current_quantity: actualQty, delta, reason: body.reason },
        ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
      });

      await publishEvent({ event_name: "inventory.stock.adjusted" as never, payload: { warehouse_id: body.warehouse_id, item_id: body.inventory_item_id, delta }, org_id: w["org_id"] as string, correlation_id: correlationId, source_function: FUNCTION_NAME });
    }
  }

  return {
    warehouse_id:       body.warehouse_id,
    inventory_item_id:  body.inventory_item_id,
    current_quantity:   currentStock ? (currentStock["current_quantity"] as number) : 0,
    reserved_quantity:  currentStock ? (currentStock["reserved_quantity"] as number) : 0,
    available_quantity: currentStock ? (currentStock["available_quantity"] as number) : 0,
    average_cost:       currentStock ? (currentStock["average_cost"] as number) : 0,
    stock_value:        currentStock ? (currentStock["stock_value"] as number) : 0,
    status:             currentStock ? (currentStock["status"] as string) : "active",
  };
}
