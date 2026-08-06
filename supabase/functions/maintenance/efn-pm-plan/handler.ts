/**
 * maintenance/efn-pm-plan/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles CRUD operations for PM Plans.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { PmPlanResult } from "./types.ts";
import type { PmPlanInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-pm-plan";

export async function handlePmPlan(
  body:          PmPlanInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<PmPlanResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  if (body.action === "create") {
    const planId = generateUuid();
    const planNumber = `PM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const orgId = claims.is_platform_admin ? (body.org_id ?? claims.org_id) : claims.org_id;

    if (!orgId) throw new ForbiddenError("org_id is required", correlationId);

    const { error: insErr } = await db.from("pm_plans").insert({
      id:                      planId,
      plan_number:             planNumber,
      org_id:                  orgId,
      vendor_id:               body.vendor_id ?? null,
      asset_id:                body.asset_id ?? null,
      site_id:                 body.site_id ?? null,
      building_id:             body.building_id ?? null,
      floor_id:                body.floor_id ?? null,
      room_id:                 body.room_id ?? null,
      service_category_id:     body.service_category_id,
      service_type_id:         body.service_type_id ?? null,
      frequency:               body.frequency,
      start_date:              body.start_date,
      end_date:                body.end_date ?? null,
      next_due_date:           body.start_date, // Initial next due date is the start date
      estimated_duration_mins: body.estimated_duration_mins ?? null,
      checklist_template_id:   body.checklist_template_id ?? null,
      assigned_technician_id:  body.assigned_technician_id ?? null,
      priority:                body.priority,
      status:                  "active",
      created_by:              claims.sub,
      created_at:              now,
    });

    if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: orgId,
      entity_type: "pm_plan", entity_id: planId, action: "CREATE",
      new_value: { plan_number: planNumber, frequency: body.frequency, target_asset: body.asset_id },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({ event_name: "pm.plan.created" as never, payload: { plan_id: planId, plan_number: planNumber }, org_id: orgId, correlation_id: correlationId, source_function: FUNCTION_NAME });
    log.info({ correlationId, planId }, "PM Plan created");

    return { action: "create", plan_id: planId, plan_number: planNumber, status: "active" };

  } else if (body.action === "update") {
    const { data: plan } = await db.from("pm_plans").select("org_id, vendor_id, plan_number, status").eq("id", body.plan_id).maybeSingle();
    if (!plan) throw new NotFoundError("PM Plan", correlationId);

    if (!claims.is_platform_admin) {
      if (plan["org_id"] !== claims.org_id) throw new ForbiddenError("Cannot modify PM plan for another organization", correlationId);
    }

    const patch: Record<string, unknown> = { updated_by: claims.sub, updated_at: now };
    if (body.vendor_id !== undefined) patch["vendor_id"] = body.vendor_id;
    if (body.frequency !== undefined) patch["frequency"] = body.frequency;
    if (body.end_date !== undefined) patch["end_date"] = body.end_date;
    if (body.estimated_duration_mins !== undefined) patch["estimated_duration_mins"] = body.estimated_duration_mins;
    if (body.checklist_template_id !== undefined) patch["checklist_template_id"] = body.checklist_template_id;
    if (body.assigned_technician_id !== undefined) patch["assigned_technician_id"] = body.assigned_technician_id;
    if (body.priority !== undefined) patch["priority"] = body.priority;

    const { error: updErr } = await db.from("pm_plans").update(patch).eq("id", body.plan_id);
    if (updErr) throw new Error(`Update failed: ${updErr.message}`);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: plan["org_id"] as string,
      entity_type: "pm_plan", entity_id: body.plan_id, action: "UPDATE",
      new_value: patch, ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({ event_name: "pm.plan.updated" as never, payload: { plan_id: body.plan_id }, org_id: plan["org_id"] as string, correlation_id: correlationId, source_function: FUNCTION_NAME });
    log.info({ correlationId, plan_id: body.plan_id }, "PM Plan updated");

    return { action: "update", plan_id: body.plan_id, plan_number: plan["plan_number"] as string, status: plan["status"] as string };

  } else {
    // deactivate
    const { data: plan } = await db.from("pm_plans").select("org_id, plan_number").eq("id", body.plan_id).maybeSingle();
    if (!plan) throw new NotFoundError("PM Plan", correlationId);

    if (!claims.is_platform_admin) {
      if (plan["org_id"] !== claims.org_id) throw new ForbiddenError("Cannot modify PM plan for another organization", correlationId);
    }

    await db.from("pm_plans").update({ status: "inactive", updated_by: claims.sub, updated_at: now }).eq("id", body.plan_id);
    
    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: plan["org_id"] as string,
      entity_type: "pm_plan", entity_id: body.plan_id, action: "DEACTIVATE",
      new_value: { status: "inactive" }, ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({ event_name: "pm.plan.updated" as never, payload: { plan_id: body.plan_id, status: "inactive" }, org_id: plan["org_id"] as string, correlation_id: correlationId, source_function: FUNCTION_NAME });
    log.info({ correlationId, plan_id: body.plan_id }, "PM Plan deactivated");

    return { action: "deactivate", plan_id: body.plan_id, plan_number: plan["plan_number"] as string, status: "inactive" };
  }
}
