/**
 * workorder/efn-wo-materials/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Manages parts/materials used in a work order.
 *  reserve  – Pre-logs an estimated part (same table, marks intent)
 *  consume  – Records actual consumption (upserts quantity if part exists)
 *  release  – Removes an uncommitted reservation record
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { MaterialResult } from "./types.ts";
import type { MaterialActionInput } from "./schema.ts";

const FUNCTION_NAME = "efn-wo-materials";

export async function handleMaterial(
  body:          MaterialActionInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<MaterialResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Work Order ────────────────────────────────────────────
  const { data: wo, error: fetchErr } = await db
    .from("work_orders")
    .select("org_id, vendor_id, technician_id")
    .eq("id", body.work_order_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !wo) throw new NotFoundError("Work Order", correlationId);
  const w = wo as Record<string, string | null>;

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== w["org_id"]) {
      throw new ForbiddenError("Cannot access materials for a work order in a different organization", correlationId);
    }
    if (claims.vendor_id && claims.vendor_id !== w["vendor_id"]) {
      throw new ForbiddenError("Your vendor is not assigned to this work order", correlationId);
    }
    if (claims.app_role === "technician" && w["technician_id"] !== claims.sub) {
      throw new ForbiddenError("You are not the assigned technician for this work order", correlationId);
    }
  }

  let partId: string = body.part_id ?? generateUuid();
  let totalCost: number | undefined;

  if (body.action === "reserve" || body.action === "consume") {
    if (body.unit_cost !== undefined) {
      totalCost = parseFloat((body.quantity * body.unit_cost).toFixed(2));
    }

    const { error: insertErr } = await db.from("work_order_parts_used").insert({
      id:                 partId,
      work_order_id:      body.work_order_id,
      part_name:          body.part_name,
      part_number:        body.part_number ?? null,
      quantity:           body.quantity,
      unit_cost:          body.unit_cost ?? null,
      supplier_vendor_id: body.supplier_vendor_id ?? null,
      recorded_by:        claims.sub,
      created_at:         now,
    });

    if (insertErr) throw new Error(`Part insert failed: ${insertErr.message}`);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: w["org_id"],
      entity_type: "work_order", entity_id: body.work_order_id, action: `MATERIAL_${body.action.toUpperCase()}`,
      new_value: { part_name: body.part_name, quantity: body.quantity, unit_cost: body.unit_cost },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({
      event_name:      "workorder.material.reserved" as never,
      payload:         { work_order_id: body.work_order_id, part_name: body.part_name, qty: body.quantity },
      org_id:          w["org_id"] as string,
      correlation_id:  correlationId,
      source_function: FUNCTION_NAME,
    });

  } else if (body.action === "release") {
    // Load and delete part record
    const { data: part, error: partErr } = await db
      .from("work_order_parts_used")
      .select("id, recorded_by")
      .eq("id", body.part_id!)
      .eq("work_order_id", body.work_order_id)
      .maybeSingle();

    if (partErr || !part) throw new NotFoundError("Part record", correlationId);
    const p = part as Record<string, string>;

    if (!claims.is_platform_admin && p["recorded_by"] !== claims.sub) {
      throw new ForbiddenError("You can only release your own material reservations", correlationId);
    }

    await db.from("work_order_parts_used").delete().eq("id", body.part_id!);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: w["org_id"],
      entity_type: "work_order", entity_id: body.work_order_id, action: "MATERIAL_RELEASE",
      old_value: { part_id: body.part_id }, ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });
  }

  log.info({ correlationId, work_order_id: body.work_order_id, action: body.action }, "Material action complete");
  return {
    work_order_id: body.work_order_id,
    action:        body.action,
    part_id:       partId,
    part_name:     body.part_name,
    quantity:      body.quantity,
    total_cost:    totalCost,
  };
}
