/**
 * inventory/efn-inventory-item/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles CRUD operations for inventory items.
 * Validates unique constraints for item_code, barcode, qr_code.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ConflictError, NotFoundError, ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { InventoryItemResult } from "./types.ts";
import type { InventoryItemInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-inventory-item";

export async function handleInventoryItem(
  body:          InventoryItemInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<InventoryItemResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  if (body.action === "create") {
    const itemId = generateUuid();

    // Check unique constraints
    const { data: existing } = await db.from("inventory_items")
      .select("id, item_code, barcode, qr_code")
      .or(`item_code.eq.${body.item_code},barcode.eq.${body.barcode ?? ''},qr_code.eq.${body.qr_code ?? ''}`);

    if (existing && existing.length > 0) {
      throw new ConflictError("An item with the given item_code, barcode, or qr_code already exists.", correlationId);
    }

    const { error: insertErr } = await db.from("inventory_items").insert({
      id:            itemId,
      item_code:     body.item_code,
      name:          body.name,
      description:   body.description ?? null,
      category:      body.category,
      manufacturer:  body.manufacturer ?? null,
      part_number:   body.part_number ?? null,
      unit:          body.unit,
      minimum_stock: body.minimum_stock,
      maximum_stock: body.maximum_stock ?? null,
      reorder_level: body.reorder_level ?? null,
      barcode:       body.barcode ?? null,
      qr_code:       body.qr_code ?? null,
      status:        "active",
      created_by:    claims.sub,
      created_at:    now,
    });

    if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: claims.org_id,
      entity_type: "inventory_item", entity_id: itemId, action: "CREATE",
      new_value: { item_code: body.item_code, name: body.name },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({ event_name: "inventory.item.created" as never, payload: { item_id: itemId }, org_id: "", correlation_id: correlationId, source_function: FUNCTION_NAME });
    log.info({ correlationId, itemId }, "Inventory item created");

    return { action: "create", item_id: itemId, item_code: body.item_code, name: body.name, category: body.category, unit: body.unit, minimum_stock: body.minimum_stock, status: "active" };

  } else if (body.action === "update") {
    const { data: item } = await db.from("inventory_items").select("*").eq("id", body.item_id).maybeSingle();
    if (!item) throw new NotFoundError("Inventory Item", correlationId);

    // If changing unique fields, validate
    if (body.barcode || body.qr_code) {
      const orClauses = [];
      if (body.barcode) orClauses.push(`barcode.eq.${body.barcode}`);
      if (body.qr_code) orClauses.push(`qr_code.eq.${body.qr_code}`);
      const { data: existing } = await db.from("inventory_items")
        .select("id")
        .neq("id", body.item_id)
        .or(orClauses.join(","));
      if (existing && existing.length > 0) throw new ConflictError("Barcode or QR code is already in use by another item", correlationId);
    }

    const patch: Record<string, unknown> = { updated_by: claims.sub, updated_at: now };
    if (body.name !== undefined) patch["name"] = body.name;
    if (body.description !== undefined) patch["description"] = body.description;
    if (body.category !== undefined) patch["category"] = body.category;
    if (body.manufacturer !== undefined) patch["manufacturer"] = body.manufacturer;
    if (body.part_number !== undefined) patch["part_number"] = body.part_number;
    if (body.unit !== undefined) patch["unit"] = body.unit;
    if (body.minimum_stock !== undefined) patch["minimum_stock"] = body.minimum_stock;
    if (body.maximum_stock !== undefined) patch["maximum_stock"] = body.maximum_stock;
    if (body.reorder_level !== undefined) patch["reorder_level"] = body.reorder_level;
    if (body.barcode !== undefined) patch["barcode"] = body.barcode;
    if (body.qr_code !== undefined) patch["qr_code"] = body.qr_code;

    const { error: updErr } = await db.from("inventory_items").update(patch).eq("id", body.item_id);
    if (updErr) throw new Error(`Update failed: ${updErr.message}`);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: claims.org_id,
      entity_type: "inventory_item", entity_id: body.item_id, action: "UPDATE",
      new_value: patch, ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({ event_name: "inventory.item.updated" as never, payload: { item_id: body.item_id }, org_id: "", correlation_id: correlationId, source_function: FUNCTION_NAME });
    log.info({ correlationId, item_id: body.item_id }, "Inventory item updated");

    const r = item as Record<string, unknown>;
    return { action: "update", item_id: body.item_id, item_code: r["item_code"] as string, name: (body.name ?? r["name"]) as string, category: (body.category ?? r["category"]) as string, unit: (body.unit ?? r["unit"]) as string, minimum_stock: (body.minimum_stock ?? r["minimum_stock"]) as number, status: r["status"] as string };

  } else {
    // deactivate
    const { data: item } = await db.from("inventory_items").select("*").eq("id", body.item_id).maybeSingle();
    if (!item) throw new NotFoundError("Inventory Item", correlationId);

    await db.from("inventory_items").update({ status: "inactive", updated_by: claims.sub, updated_at: now }).eq("id", body.item_id);
    log.info({ correlationId, item_id: body.item_id }, "Inventory item deactivated");

    const r = item as Record<string, unknown>;
    return { action: "deactivate", item_id: body.item_id, item_code: r["item_code"] as string, name: r["name"] as string, category: r["category"] as string, unit: r["unit"] as string, minimum_stock: r["minimum_stock"] as number, status: "inactive" };
  }
}
