/**
 * organization/efn-org-create/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Creates a new Organization with full default initialization.
 *
 * Steps:
 *   1.  Duplicate email check (admin_email must be globally unique)
 *   2.  Resolve seat limits from plan defaults (or override)
 *   3.  Generate org code (e.g. "ORG-2026-ABCD")
 *   4.  INSERT organization row
 *   5.  INSERT default business hours
 *   6.  Initialize dashboard_snapshots seed row
 *   7.  Write audit_log
 *   8.  Write activity_timeline
 *   9.  Publish organization.created event
 *
 * Security:
 *   - Only system_admin can call this function (asserted in index.ts)
 *   - Uses adminClient() — creates org before any user exists
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ConflictError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { CreateOrgResult } from "./types.ts";
import { PLAN_SEAT_DEFAULTS, DEFAULT_BUSINESS_HOURS } from "./types.ts";
import type { CreateOrgInput } from "./schema.ts";

const FUNCTION_NAME = "efn-org-create";

// ── Org Code Generator ─────────────────────────────────────────────
function generateOrgCode(): string {
  const year   = new Date().getUTCFullYear();
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `ORG-${year}-${suffix}`;
}

export async function createOrganization(
  body:          CreateOrgInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<CreateOrgResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Duplicate admin_email check ───────────────────────────────
  const { data: existing } = await db
    .from("organizations")
    .select("id")
    .eq("admin_email", body.admin_email)
    .maybeSingle();

  if (existing) {
    throw new ConflictError(
      `An organization already exists for admin email '${body.admin_email}'`,
      correlationId,
    );
  }

  // ── 2. Resolve seat limits ────────────────────────────────────────
  const planDefaults = PLAN_SEAT_DEFAULTS[body.plan];
  const seats = {
    users:        body.license_seats_users        ?? planDefaults.users,
    vendors:      body.license_seats_vendors      ?? planDefaults.vendors,
    technicians:  body.license_seats_technicians  ?? planDefaults.technicians,
  };

  // ── 3. Generate unique org code ───────────────────────────────────
  const orgCode = generateOrgCode();
  const orgId   = generateUuid();
  const now     = nowUtc();

  // ── 4. Insert organization ────────────────────────────────────────
  const { error: orgErr } = await db.from("organizations").insert({
    id:                       orgId,
    name:                     body.name,
    industry:                 body.industry   ?? null,
    description:              body.description ?? null,
    plan:                     body.plan,
    status:                   "pending_setup",
    admin_name:               body.admin_name,
    admin_email:              body.admin_email,
    admin_phone:              body.admin_phone ?? null,
    region:                   body.region     ?? null,
    city:                     body.city       ?? null,
    country:                  body.country    ?? null,
    logo_url:                 null,
    license_seats_users:      seats.users,
    license_seats_vendors:    seats.vendors,
    license_seats_technicians: seats.technicians,
    subscription_renewal:     body.subscription_renewal ?? null,
    ticket_count:             0,
    asset_count:              0,
    created_by:               claims.sub,
    created_at:               now,
  });

  if (orgErr) throw new Error(`Organization insert failed: ${orgErr.message}`);

  // ── 5. Insert default business hours ─────────────────────────────
  const { error: bhErr } = await db.from("business_hours").insert({
    id:                      generateUuid(),
    org_id:                  orgId,
    name:                    DEFAULT_BUSINESS_HOURS.name,
    working_days:            DEFAULT_BUSINESS_HOURS.working_days,
    start_time:              DEFAULT_BUSINESS_HOURS.start_time,
    end_time:                DEFAULT_BUSINESS_HOURS.end_time,
    break_duration_minutes:  DEFAULT_BUSINESS_HOURS.break_duration_minutes,
    timezone:                body.timezone ?? DEFAULT_BUSINESS_HOURS.timezone,
    status:                  "active",
    created_by:              claims.sub,
    created_at:              now,
  });

  if (bhErr) {
    log.warn({ correlationId, orgId, error: bhErr.message }, "Business hours init failed — non-fatal");
  }

  // ── 6. Seed dashboard snapshot ────────────────────────────────────
  await db.from("dashboard_snapshots").upsert({
    id:               generateUuid(),
    dashboard_type:   "org_executive",
    org_id:           orgId,
    reporting_date:   now.substring(0, 10),
    summary_data:     { org_id: orgId, initialized: true },
    widget_data:      {},
    created_at:       now,
  }, { onConflict: "dashboard_type,org_id,vendor_id,reporting_date" });

  // ── 7. Audit log ──────────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      orgId,
    vendor_id:   null,
    entity_type: "organization",
    entity_id:   orgId,
    action:      "CREATE",
    old_value:   null,
    new_value:   { name: body.name, plan: body.plan, admin_email: body.admin_email, org_code: orgCode },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  // ── 8. Activity timeline ──────────────────────────────────────────
  await db.from("activity_timeline").insert({
    id:               generateUuid(),
    entity_type:      "organization",
    entity_id:        orgId,
    activity_type:    "organization_created",
    description:      `Organization '${body.name}' created on the ${body.plan} plan`,
    performed_by_id:  claims.sub,
    role:             claims.app_role,
    metadata:         { org_code: orgCode, plan: body.plan, correlation_id: correlationId },
    occurred_at:      now,
  });

  // ── 9. Publish event ──────────────────────────────────────────────
  await publishEvent({
    event_name:      "organization.created" as never,
    payload:         { org_id: orgId, name: body.name, plan: body.plan, org_code: orgCode, admin_email: body.admin_email },
    org_id:          orgId,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, orgId, plan: body.plan, orgCode }, "Organization created successfully");

  return {
    org_id:     orgId,
    org_code:   orgCode,
    name:       body.name,
    plan:       body.plan,
    status:     "pending_setup",
    created_at: now,
  };
}
