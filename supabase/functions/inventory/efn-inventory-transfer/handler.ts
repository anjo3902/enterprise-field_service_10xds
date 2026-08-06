/**
 * inventory/efn-inventory-transfer/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles inventory transfers between warehouses or between warehouse and technician.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError, ConflictError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { TransferResult } from "./types.ts";
import type { InventoryTransferInput } from "./schema.ts";

const FUNCTION_NAME = "efn-inventory-transfer";

export async function handleInventoryTransfer(
  body:          InventoryTransferInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<TransferResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  const isW2W = body.transfer_type === "warehouse_to_warehouse";
  const isW2T = body.transfer_type === "warehouse_to_technician";
  const isT2W = body.transfer_type === "technician_to_warehouse";

  const sourceWHId = (isW2W || isW2T) ? body.source_id : null;
  const destWHId   = (isW2W || isT2W) ? body.destination_id : null;
  const techId     = isW2T ? body.destination_id : isT2W ? body.source_id : null;

  // 1. Fetch Source Stock / Inventory
  let sourceAvail = 0;
  if (sourceWHId) {
    const { data: sStock } = await db.from("warehouse_stock").select("id, available_quantity").eq("warehouse_id", sourceWHId).eq("inventory_item_id", body.inventory_item_id).maybeSingle();
    if (!sStock) throw new NotFoundError("Source stock not found", correlationId);
    sourceAvail = sStock["available_quantity"] as number;
  } else if (techId) {
    const { data: tStock } = await db.from("technician_inventory").select("id, quantity").eq("technician_id", techId).eq("inventory_item_id", body.inventory_item_id).maybeSingle();
    if (!tStock) throw new NotFoundError("Technician stock not found", correlationId);
    sourceAvail = tStock["quantity"] as number;
  }

  if (body.quantity > sourceAvail) throw new ConflictError(`Insufficient stock for transfer. Requested: ${body.quantity}, Available: ${sourceAvail}`, correlationId);

  const transferId = generateUuid();

  // 2. Perform Transfer operations
  if (sourceWHId) {
    // Decrease source warehouse
    const { data: sStock } = await db.from("warehouse_stock").select("current_quantity").eq("warehouse_id", sourceWHId).eq("inventory_item_id", body.inventory_item_id).single();
    await db.from("warehouse_stock").update({ current_quantity: (sStock!["current_quantity"] as number) - body.quantity, updated_at: now }).eq("warehouse_id", sourceWHId).eq("inventory_item_id", body.inventory_item_id);
    await db.from("stock_movements").insert({
      id: generateUuid(), inventory_item_id: body.inventory_item_id, warehouse_id: sourceWHId,
      movement_type: "transfer", quantity: -body.quantity, reference_type: "transfer_out", reference_id: transferId, performed_by: claims.sub, remarks: body.remarks, movement_date: now
    });
  } else if (techId) {
    // Decrease technician inventory
    const { data: tStock } = await db.from("technician_inventory").select("quantity").eq("technician_id", techId).eq("inventory_item_id", body.inventory_item_id).single();
    await db.from("technician_inventory").update({ quantity: (tStock!["quantity"] as number) - body.quantity, updated_at: now }).eq("technician_id", techId).eq("inventory_item_id", body.inventory_item_id);
  }

  if (destWHId) {
    // Increase dest warehouse
    const { data: dStock } = await db.from("warehouse_stock").select("current_quantity").eq("warehouse_id", destWHId).eq("inventory_item_id", body.inventory_item_id).maybeSingle();
    if (dStock) {
      await db.from("warehouse_stock").update({ current_quantity: (dStock["current_quantity"] as number) + body.quantity, updated_at: now }).eq("warehouse_id", destWHId).eq("inventory_item_id", body.inventory_item_id);
    } else {
      await db.from("warehouse_stock").insert({ warehouse_id: destWHId, inventory_item_id: body.inventory_item_id, current_quantity: body.quantity, average_cost: 0 });
    }
    await db.from("stock_movements").insert({
      id: generateUuid(), inventory_item_id: body.inventory_item_id, warehouse_id: destWHId,
      movement_type: "transfer", quantity: body.quantity, reference_type: "transfer_in", reference_id: transferId, performed_by: claims.sub, remarks: body.remarks, movement_date: now
    });
  } else if (techId) {
    // Increase technician inventory
    const { data: tStock } = await db.from("technician_inventory").select("quantity").eq("technician_id", techId).eq("inventory_item_id", body.inventory_item_id).maybeSingle();
    if (tStock) {
      await db.from("technician_inventory").update({ quantity: (tStock["quantity"] as number) + body.quantity, updated_at: now }).eq("technician_id", techId).eq("inventory_item_id", body.inventory_item_id);
    } else {
      await db.from("technician_inventory").insert({ technician_id: techId, inventory_item_id: body.inventory_item_id, quantity: body.quantity });
    }
  }

  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: claims.org_id,
    entity_type: "inventory_transfer", entity_id: transferId, action: "TRANSFER",
    new_value: { type: body.transfer_type, source: body.source_id, dest: body.destination_id, item: body.inventory_item_id, qty: body.quantity },
    ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
  });

  await publishEvent({ event_name: "inventory.stock.transferred" as never, payload: { transfer_id: transferId, item_id: body.inventory_item_id, quantity: body.quantity }, org_id: claims.org_id ?? "", correlation_id: correlationId, source_function: FUNCTION_NAME });

  log.info({ correlationId, transferId, type: body.transfer_type }, "Inventory transfer completed");

  return {
    transfer_id: transferId,
    source_id: body.source_id,
    destination_id: body.destination_id,
    transfer_type: body.transfer_type,
    inventory_item_id: body.inventory_item_id,
    quantity: body.quantity,
  };
}
