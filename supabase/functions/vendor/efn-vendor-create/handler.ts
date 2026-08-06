/**
 * vendor/efn-vendor-create/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Creates a new Vendor entity.
 *
 * Steps:
 *   1.  Duplicate name check (case-insensitive)
 *   2.  Insert vendor row (status: pending_approval — requires system_admin approval)
 *   3.  Seed dashboard_snapshots row for vendor_performance type
 *   4.  Seed vendor_performance_metrics row for current period
 *   5.  Write audit_log
 *   6.  Write activity_timeline
 *   7.  Publish vendor.created event
 *
 * Security:
 *   Only system_admin can create vendors (asserted in index.ts).
 *   Vendors start as pending_approval — system_admin must explicitly activate.
 */

import { adminClient }    from "../../shared/db/client.ts";
import { createLogger }   from "../../shared/logging/logger.ts";
import { publishEvent }   from "../../shared/events/publisher.ts";
import { generateUuid }   from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }         from "../../shared/utils/date-helpers.ts";
import { ConflictError }  from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { CreateVendorResult } from "./types.ts";
import { generateVendorCode } from "./types.ts";
import type { CreateVendorInput } from "./schema.ts";

const FUNCTION_NAME = "efn-vendor-create";

export async function createVendor(
  body:          CreateVendorInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<CreateVendorResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Duplicate Name Check (case-insensitive) ────────────────────
  const { data: existing } = await db
    .from("vendors")
    .select("id")
    .ilike("name", body.name)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    throw new ConflictError(
      `A vendor with the name '${body.name}' already exists`,
      correlationId,
    );
  }

  // ── 2. Insert Vendor ──────────────────────────────────────────────
  const vendorId   = generateUuid();
  const vendorCode = generateVendorCode();

  const { error: vendorErr } = await db.from("vendors").insert({
    id:               vendorId,
    name:             body.name,
    trade_domains:    body.trade_domains,
    service_regions:  body.service_regions ?? [],
    status:           "pending_approval",
    manager_name:     body.manager_name  ?? null,
    manager_email:    body.manager_email ?? null,
    manager_phone:    body.manager_phone ?? null,
    sla_target:       body.sla_target,
    license_number:   body.license_number ?? null,
    license_expiry:   body.license_expiry ?? null,
    contract_id:      body.contract_id   ?? null,
    technician_count: 0,
    created_by:       claims.sub,
    created_at:       now,
  });

  if (vendorErr) throw new Error(`Vendor insert failed: ${vendorErr.message}`);

  // ── 3. Seed Dashboard Snapshot ────────────────────────────────────
  await db.from("dashboard_snapshots").upsert({
    id:              generateUuid(),
    dashboard_type:  "vendor_performance",
    vendor_id:       vendorId,
    reporting_date:  now.substring(0, 10),
    summary_data:    { vendor_id: vendorId, vendor_code: vendorCode, initialized: true },
    widget_data:     {},
    created_at:      now,
  }, { onConflict: "dashboard_type,org_id,vendor_id,reporting_date" });

  // ── 4. Seed Performance Metrics Row ──────────────────────────────
  await db.from("vendor_performance_metrics").upsert({
    id:                       generateUuid(),
    vendor_id:                vendorId,
    reporting_period:         now.substring(0, 10),
    tickets_completed:        0,
    avg_response_time_mins:   null,
    avg_resolution_time_mins: null,
    sla_compliance_pct:       null,
    customer_rating:          null,
    performance_score:        null,
    revenue:                  0,
    cost:                     0,
    created_at:               now,
  }, { onConflict: "vendor_id,reporting_period" });

  // ── 5. Audit Log ──────────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      null,
    vendor_id:   vendorId,
    entity_type: "vendor",
    entity_id:   vendorId,
    action:      "CREATE",
    old_value:   null,
    new_value:   {
      name:          body.name,
      trade_domains: body.trade_domains,
      vendor_code:   vendorCode,
      sla_target:    body.sla_target,
    },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  // ── 6. Activity Timeline ──────────────────────────────────────────
  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "vendor",
    entity_id:        vendorId,
    activity_type:    "vendor_created",
    description:      `Vendor '${body.name}' created — pending approval`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         {
      vendor_code:   vendorCode,
      trade_domains: body.trade_domains,
      correlation_id: correlationId,
    },
    occurred_at: now,
  });

  // ── 7. Publish Event ──────────────────────────────────────────────
  await publishEvent({
    event_name:      "vendor.created" as never,
    payload:         {
      vendor_id:     vendorId,
      vendor_code:   vendorCode,
      name:          body.name,
      trade_domains: body.trade_domains,
      status:        "pending_approval",
    },
    vendor_id:       vendorId,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, vendorId, vendorCode }, "Vendor created successfully");

  return {
    vendor_id:   vendorId,
    vendor_code: vendorCode,
    name:        body.name,
    status:      "pending_approval",
    created_at:  now,
  };
}
