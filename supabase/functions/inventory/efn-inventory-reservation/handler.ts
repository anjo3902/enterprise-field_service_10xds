/**
 * inventory/efn-inventory-reservation/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Reserves parts for work orders.
 * Validates available stock, prevents over-allocation.
 * Updates warehouse_stock.reserved_quantity.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError, ConflictError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { ReservationResult } from "./types.ts";
import type { InventoryReservationInput } from "./schema.ts";

const FUNCTION_NAME = "efn-inventory-reservation";

export async function handleInventoryReservation(
  body:          InventoryReservationInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<ReservationResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  if (body.action === "reserve") {
    // 1. Fetch Stock
    const { data: currentStock } = await db.from("warehouse_stock")
      .select("id, current_quantity, reserved_quantity, available_quantity, average_cost")
      .eq("warehouse_id", body.warehouse_id)
      .eq("inventory_item_id", body.inventory_item_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!currentStock) throw new NotFoundError("Stock in warehouse", correlationId);

    const available = currentStock["available_quantity"] as number;
    if (body.quantity! > available) {
      throw new ConflictError(`Cannot reserve ${body.quantity}. Only ${available} available.`, correlationId);
    }

    const resId = generateUuid();
    // 2. Insert Reservation
    const { error: resErr } = await db.from("parts_reservations").insert({
      id:                resId,
      work_order_id:     body.work_order_id,
      inventory_item_id: body.inventory_item_id,
      warehouse_id:      body.warehouse_id,
      reserved_quantity: body.quantity,
      reserved_by:       claims.sub,
      reserved_at:       now,
      status:            "active",
    });
    if (resErr) throw new Error(`Failed to create reservation: ${resErr.message}`);

    // 3. Update Warehouse Stock
    const newReserved = (currentStock["reserved_quantity"] as number) + body.quantity!;
    await db.from("warehouse_stock").update({ reserved_quantity: newReserved, updated_at: now }).eq("id", currentStock["id"]);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: claims.org_id,
      entity_type: "parts_reservation", entity_id: resId, action: "RESERVE",
      new_value: { quantity: body.quantity, work_order_id: body.work_order_id },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({ event_name: "inventory.stock.reserved" as never, payload: { reservation_id: resId, item_id: body.inventory_item_id, quantity: body.quantity }, org_id: claims.org_id ?? "", correlation_id: correlationId, source_function: FUNCTION_NAME });

    return { action: "reserve", reservation_id: resId, work_order_id: body.work_order_id!, inventory_item_id: body.inventory_item_id!, warehouse_id: body.warehouse_id!, quantity: body.quantity!, status: "active" };

  } else {
    // release, cancel, consume
    const { data: res } = await db.from("parts_reservations").select("*").eq("id", body.reservation_id).maybeSingle();
    if (!res) throw new NotFoundError("Reservation", correlationId);
    const r = res as Record<string, unknown>;
    const qty = r["reserved_quantity"] as number;

    if (r["status"] !== "active") throw new ConflictError(`Reservation is already ${r["status"]}`, correlationId);

    // Get current stock
    const { data: stock } = await db.from("warehouse_stock").select("id, reserved_quantity, current_quantity, average_cost").eq("warehouse_id", r["warehouse_id"]).eq("inventory_item_id", r["inventory_item_id"]).maybeSingle();
    const st = stock as Record<string, unknown>;
    const currentReserved = st ? (st["reserved_quantity"] as number) : 0;
    const currentQty      = st ? (st["current_quantity"] as number) : 0;
    const avgCost         = st ? (st["average_cost"] as number) : 0;

    let newStatus = body.action === "consume" ? "consumed" : "released";
    if (body.action === "cancel") newStatus = "cancelled";

    // Update reservation
    await db.from("parts_reservations").update({ status: newStatus, released_at: now, updated_at: now }).eq("id", body.reservation_id);

    // If released/cancelled, reduce reserved qty
    if (body.action === "release" || body.action === "cancel") {
      const newReserved = Math.max(0, currentReserved - qty);
      if (st) {
        await db.from("warehouse_stock").update({ reserved_quantity: newReserved, updated_at: now }).eq("id", st["id"]);
      }
      await publishEvent({ event_name: "inventory.stock.released" as never, payload: { reservation_id: body.reservation_id, item_id: r["inventory_item_id"], quantity: qty }, org_id: claims.org_id ?? "", correlation_id: correlationId, source_function: FUNCTION_NAME });
    }

    // If consumed, reduce both current and reserved qty, write consumption + movement
    if (body.action === "consume") {
      const newReserved = Math.max(0, currentReserved - qty);
      const newCurrent  = Math.max(0, currentQty - qty);

      if (st) {
        await db.from("warehouse_stock").update({ current_quantity: newCurrent, reserved_quantity: newReserved, updated_at: now }).eq("id", st["id"]);
      }
      
      const cost = body.consumption_cost ?? (qty * avgCost);

      await db.from("parts_consumption").insert({
        id: generateUuid(), work_order_id: r["work_order_id"], inventory_item_id: r["inventory_item_id"],
        quantity_used: qty, cost, status: "consumed", consumed_at: now
      });

      await db.from("stock_movements").insert({
        id: generateUuid(), inventory_item_id: r["inventory_item_id"], warehouse_id: r["warehouse_id"],
        movement_type: "consumption", quantity: -qty, reference_type: "work_order", reference_id: r["work_order_id"],
        performed_by: claims.sub, movement_date: now
      });

      await publishEvent({ event_name: "inventory.stock.consumed" as never, payload: { reservation_id: body.reservation_id, item_id: r["inventory_item_id"], quantity: qty }, org_id: claims.org_id ?? "", correlation_id: correlationId, source_function: FUNCTION_NAME });
    }

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: claims.org_id,
      entity_type: "parts_reservation", entity_id: body.reservation_id!, action: body.action.toUpperCase(),
      new_value: { status: newStatus }, ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    log.info({ correlationId, resId: body.reservation_id, action: body.action }, "Reservation processed");

    return { action: body.action, reservation_id: body.reservation_id!, work_order_id: r["work_order_id"] as string, inventory_item_id: r["inventory_item_id"] as string, warehouse_id: r["warehouse_id"] as string, quantity: qty, status: newStatus };
  }
}
