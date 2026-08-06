/**
 * maintenance/efn-warranty-management/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles CRUD operations for Warranty records on assets.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { WarrantyResult } from "./types.ts";
import type { WarrantyManagementInput } from "./schema.ts";

const FUNCTION_NAME = "efn-warranty-management";

export async function handleWarrantyManagement(
  body:          WarrantyManagementInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<WarrantyResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  if (body.action === "create") {
    const { data: asset } = await db.from("assets").select("org_id").eq("id", body.asset_id).maybeSingle();
    if (!asset) throw new NotFoundError("Asset", correlationId);

    if (!claims.is_platform_admin && asset["org_id"] !== claims.org_id) {
      throw new ForbiddenError("Permission denied", correlationId);
    }

    const warrantyId = generateUuid();
    const { error: insErr } = await db.from("warranty_records").insert({
      id:               warrantyId,
      asset_id:         body.asset_id,
      warranty_number:  body.warranty_number,
      manufacturer:     body.manufacturer,
      warranty_type:    body.warranty_type,
      start_date:       body.start_date,
      end_date:         body.end_date,
      coverage_details: body.coverage_details ?? null,
      vendor_id:        body.vendor_id ?? null,
      status:           "activated",
      created_by:       claims.sub,
      created_at:       now,
    });
    if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: asset["org_id"] as string,
      entity_type: "warranty_record", entity_id: warrantyId, action: "CREATE",
      new_value: { warranty_number: body.warranty_number, asset: body.asset_id },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({ event_name: "warranty.created" as never, payload: { warranty_id: warrantyId }, org_id: asset["org_id"] as string, correlation_id: correlationId, source_function: FUNCTION_NAME });
    log.info({ correlationId, warrantyId }, "Warranty created");

    return { action: "create", warranty_id: warrantyId, status: "activated" };
  } else {
    // update
    const { data: warranty } = await db.from("warranty_records").select("asset_id, status").eq("id", body.warranty_id).maybeSingle();
    if (!warranty) throw new NotFoundError("Warranty Record", correlationId);

    const { data: asset } = await db.from("assets").select("org_id").eq("id", warranty.asset_id).single();
    if (!claims.is_platform_admin && asset!["org_id"] !== claims.org_id) {
      throw new ForbiddenError("Permission denied", correlationId);
    }

    const patch: Record<string, unknown> = { updated_by: claims.sub, updated_at: now };
    if (body.warranty_type !== undefined) patch["warranty_type"] = body.warranty_type;
    if (body.end_date !== undefined) patch["end_date"] = body.end_date;
    if (body.coverage_details !== undefined) patch["coverage_details"] = body.coverage_details;
    if (body.vendor_id !== undefined) patch["vendor_id"] = body.vendor_id;
    if (body.status !== undefined) patch["status"] = body.status;

    await db.from("warranty_records").update(patch).eq("id", body.warranty_id);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: asset!["org_id"] as string,
      entity_type: "warranty_record", entity_id: body.warranty_id, action: "UPDATE",
      new_value: patch, ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    if (body.status === "expired") {
      await publishEvent({ event_name: "warranty.expired" as never, payload: { warranty_id: body.warranty_id }, org_id: asset!["org_id"] as string, correlation_id: correlationId, source_function: FUNCTION_NAME });
    }

    return { action: "update", warranty_id: body.warranty_id, status: body.status ?? warranty["status"] as string };
  }
}
