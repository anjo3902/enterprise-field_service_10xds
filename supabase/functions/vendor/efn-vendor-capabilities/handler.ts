/**
 * vendor/efn-vendor-capabilities/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * CRUD for vendor_service_capabilities.
 *
 * upsert: Inserts or updates a capability binding (vendor ↔ service_category ↔ type).
 *         The unique constraint uq_vendor_service_capability prevents duplicates.
 * remove: Soft-deletes (deleted_at) so history is preserved.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims }          from "../../shared/auth/types.ts";
import type { CapabilityResult }   from "./types.ts";
import type { CapabilityActionInput } from "./schema.ts";

const FUNCTION_NAME = "efn-vendor-capabilities";

export async function handleCapability(
  body:          CapabilityActionInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<CapabilityResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Tenant Isolation ───────────────────────────────────────────
  if (!claims.is_platform_admin && claims.vendor_id !== body.vendor_id) {
    throw new ForbiddenError("Cannot manage capabilities for a different vendor", correlationId);
  }

  // ── 2. Dispatch by Action ─────────────────────────────────────────
  if (body.action === "upsert") {
    const capabilityId = generateUuid();

    const { data: upserted, error: upsertErr } = await db
      .from("vendor_service_capabilities")
      .upsert(
        {
          id:                   capabilityId,
          vendor_id:            body.vendor_id,
          service_category_id:  body.service_category_id,
          service_type_id:      body.service_type_id ?? null,
          coverage_region:      body.coverage_region ?? null,
          response_tier:        body.response_tier   ?? null,
          maximum_capacity:     body.maximum_capacity ?? null,
          status:               "active",
          created_by:           claims.sub,
          updated_by:           claims.sub,
          created_at:           now,
          updated_at:           now,
          deleted_at:           null,
        },
        {
          onConflict: "vendor_id,service_category_id,service_type_id",
          ignoreDuplicates: false,
        },
      )
      .select("id")
      .maybeSingle();

    if (upsertErr) throw new Error(`Capability upsert failed: ${upsertErr.message}`);

    const resolvedId = (upserted as { id: string } | null)?.id ?? capabilityId;

    // Audit
    await db.from("audit_logs").insert({
      id:          generateUuid(),
      actor_id:    claims.sub,
      actor_role:  claims.app_role,
      vendor_id:   body.vendor_id,
      entity_type: "vendor_capability",
      entity_id:   resolvedId,
      action:      "UPSERT",
      new_value:   {
        service_category_id: body.service_category_id,
        service_type_id:     body.service_type_id,
        coverage_region:     body.coverage_region,
        response_tier:       body.response_tier,
      },
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
      timestamp:  now,
    });

    await publishEvent({
      event_name:      "vendor.capability.updated" as never,
      payload:         { vendor_id: body.vendor_id, capability_id: resolvedId, action: "upsert" },
      vendor_id:       body.vendor_id,
      correlation_id:  correlationId,
      source_function: FUNCTION_NAME,
    });

    log.info({ correlationId, vendor_id: body.vendor_id, capability_id: resolvedId }, "Capability upserted");
    return { capability_id: resolvedId, vendor_id: body.vendor_id, action: "upsert" };

  } else {
    // action === "remove" — soft delete
    const { data: cap, error: fetchErr } = await db
      .from("vendor_service_capabilities")
      .select("id")
      .eq("id", body.capability_id)
      .eq("vendor_id", body.vendor_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchErr || !cap) throw new NotFoundError("Vendor capability", correlationId);

    await db
      .from("vendor_service_capabilities")
      .update({ deleted_at: now, updated_by: claims.sub, updated_at: now })
      .eq("id", body.capability_id);

    await db.from("audit_logs").insert({
      id:          generateUuid(),
      actor_id:    claims.sub,
      actor_role:  claims.app_role,
      vendor_id:   body.vendor_id,
      entity_type: "vendor_capability",
      entity_id:   body.capability_id,
      action:      "DELETE",
      old_value:   { capability_id: body.capability_id },
      ip_address:  ipAddress ?? null,
      user_agent:  userAgent ?? null,
      timestamp:   now,
    });

    await publishEvent({
      event_name:      "vendor.capability.updated" as never,
      payload:         { vendor_id: body.vendor_id, capability_id: body.capability_id, action: "remove" },
      vendor_id:       body.vendor_id,
      correlation_id:  correlationId,
      source_function: FUNCTION_NAME,
    });

    log.info({ correlationId, vendor_id: body.vendor_id, capability_id: body.capability_id }, "Capability removed");
    return { capability_id: body.capability_id, vendor_id: body.vendor_id, action: "remove" };
  }
}
