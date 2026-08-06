/**
 * inventory/efn-inventory-purchase/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles purchase requests creation and status updates.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { PurchaseResult } from "./types.ts";
import type { InventoryPurchaseInput } from "./schema.ts";

const FUNCTION_NAME = "efn-inventory-purchase";

export async function handlePurchaseRequest(
  body:          InventoryPurchaseInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<PurchaseResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  if (body.action === "create") {
    const prId = generateUuid();
    // Generate simple sequential number or UUID-based
    const prNumber = `PR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    const { error: prErr } = await db.from("purchase_requests").insert({
      id:                prId,
      request_number:    prNumber,
      vendor_id:         body.vendor_id ?? claims.vendor_id ?? null,
      requested_by:      claims.sub,
      priority:          body.priority ?? "Medium",
      approval_status:   "draft",
      expected_delivery: body.expected_delivery ?? null,
      remarks:           body.remarks ?? null,
    });
    if (prErr) throw new Error(`Failed to create PR: ${prErr.message}`);

    const prItems = body.items!.map(i => ({
      id: generateUuid(),
      purchase_request_id: prId,
      inventory_item_id:   i.inventory_item_id,
      quantity:            i.quantity,
      unit_cost:           i.unit_cost ?? null,
      status:              "pending"
    }));

    const { error: itemsErr } = await db.from("purchase_request_items").insert(prItems);
    if (itemsErr) throw new Error(`Failed to add PR items: ${itemsErr.message}`);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: claims.org_id,
      entity_type: "purchase_request", entity_id: prId, action: "CREATE",
      new_value: { items_count: prItems.length },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({ event_name: "inventory.purchase.created" as never, payload: { purchase_request_id: prId }, org_id: claims.org_id ?? "", correlation_id: correlationId, source_function: FUNCTION_NAME });

    return { action: "create", purchase_request_id: prId, request_number: prNumber, status: "draft" };
  } else {
    // update_status
    const { data: pr } = await db.from("purchase_requests").select("request_number").eq("id", body.purchase_request_id).maybeSingle();
    if (!pr) throw new NotFoundError("Purchase Request", correlationId);

    await db.from("purchase_requests").update({ approval_status: body.approval_status, updated_at: now }).eq("id", body.purchase_request_id);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: claims.org_id,
      entity_type: "purchase_request", entity_id: body.purchase_request_id!, action: "UPDATE_STATUS",
      new_value: { approval_status: body.approval_status },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    log.info({ correlationId, prId: body.purchase_request_id, status: body.approval_status }, "Purchase request status updated");

    return { action: "update_status", purchase_request_id: body.purchase_request_id!, request_number: pr["request_number"] as string, status: body.approval_status! };
  }
}
