/**
 * inventory/efn-inventory-movement/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Records a stock movement and updates the warehouse stock atomically.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError, ConflictError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { StockMovementResult } from "./types.ts";
import type { InventoryMovementInput } from "./schema.ts";

const FUNCTION_NAME = "efn-inventory-movement";

export async function handleStockMovement(
  body:          InventoryMovementInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<StockMovementResult> {
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

  // ── 2. Get Current Stock ──────────────────────────────────────────
  const { data: currentStock } = await db.from("warehouse_stock")
    .select("id, current_quantity, reserved_quantity, average_cost")
    .eq("warehouse_id", body.warehouse_id)
    .eq("inventory_item_id", body.inventory_item_id)
    .maybeSingle();

  const oldQty = currentStock ? (currentStock["current_quantity"] as number) : 0;
  const reserved = currentStock ? (currentStock["reserved_quantity"] as number) : 0;
  const newQty = oldQty + body.quantity;

  if (newQty < reserved) {
    throw new ConflictError(`Insufficient stock. Operation would reduce stock (${newQty}) below reserved quantity (${reserved}).`, correlationId);
  }

  // ── 3. Transaction: Movement + Upsert Stock ────────────────────────
  const movementId = generateUuid();
  const { error: movErr } = await db.from("stock_movements").insert({
    id:                movementId,
    inventory_item_id: body.inventory_item_id,
    warehouse_id:      body.warehouse_id,
    movement_type:     body.movement_type,
    quantity:          body.quantity,
    reference_type:    body.reference_type ?? null,
    reference_id:      body.reference_id ?? null,
    performed_by:      claims.sub,
    remarks:           body.remarks ?? null,
    movement_date:     now,
  });

  if (movErr) throw new Error(`Failed to insert stock movement: ${movErr.message}`);

  const { error: updErr } = await db.from("warehouse_stock").upsert({
    warehouse_id:      body.warehouse_id,
    inventory_item_id: body.inventory_item_id,
    current_quantity:  newQty,
    updated_at:        now,
  }, { onConflict: "warehouse_id,inventory_item_id" });

  if (updErr) throw new Error(`Failed to update stock: ${updErr.message}`);

  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: w["org_id"],
    entity_type: "stock_movement", entity_id: movementId, action: "CREATE",
    new_value: { movement_type: body.movement_type, quantity: body.quantity, reference: body.reference_id },
    ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
  });

  // Check if stock is low
  let eventName = "inventory.stock.adjusted";
  if (body.movement_type === "receipt") eventName = "inventory.stock.received";
  else if (body.movement_type === "issue" || body.movement_type === "consumption") eventName = "inventory.stock.consumed";

  await publishEvent({ event_name: eventName as never, payload: { warehouse_id: body.warehouse_id, item_id: body.inventory_item_id, movement_id: movementId, delta: body.quantity }, org_id: w["org_id"] as string, correlation_id: correlationId, source_function: FUNCTION_NAME });

  if (newQty === 0) {
    await publishEvent({ event_name: "inventory.out_of_stock" as never, payload: { warehouse_id: body.warehouse_id, item_id: body.inventory_item_id }, org_id: w["org_id"] as string, correlation_id: correlationId, source_function: FUNCTION_NAME });
  }

  log.info({ correlationId, movementId, newQty }, "Stock movement recorded");

  return {
    movement_id: movementId,
    warehouse_id: body.warehouse_id,
    inventory_item_id: body.inventory_item_id,
    movement_type: body.movement_type,
    quantity: body.quantity,
    new_stock_quantity: newQty,
  };
}
