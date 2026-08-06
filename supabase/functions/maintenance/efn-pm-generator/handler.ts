/**
 * maintenance/efn-pm-generator/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Generates Work Orders from due PM Schedules.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { PmGeneratorResult } from "./types.ts";
import type { PmGeneratorInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-pm-generator";

export async function handlePmGenerator(
  body:          PmGeneratorInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<PmGeneratorResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();
  
  const targetDate = body.target_date ?? new Date().toISOString().split("T")[0];

  let query = db.from("pm_schedules")
    .select("id, pm_plan_id, scheduled_date, pm_plans!inner(org_id, vendor_id, asset_id, site_id, building_id, floor_id, room_id, service_category_id, service_type_id, checklist_template_id, priority, plan_number)")
    .eq("status", "requested")
    .lte("scheduled_date", targetDate);

  if (!claims.is_platform_admin) {
    if (claims.org_id) query = query.eq("pm_plans.org_id", claims.org_id);
    else if (claims.vendor_id) query = query.eq("pm_plans.vendor_id", claims.vendor_id);
  }

  if (body.org_id) {
    if (!claims.is_platform_admin && claims.org_id !== body.org_id) throw new ForbiddenError("Cannot generate for another org", correlationId);
    query = query.eq("pm_plans.org_id", body.org_id);
  }

  const { data: schedules, error: schedErr } = await query;
  if (schedErr) throw new Error(schedErr.message);

  if (!schedules || schedules.length === 0) {
    return { generated_count: 0, work_orders: [], status: "success" };
  }

  const generatedWos: string[] = [];

  for (const s of schedules) {
    const plan = s.pm_plans as any;
    const woId = generateUuid();
    const woNumber = `WO-PM-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
    
    // Create Work Order
    const { error: woErr } = await db.from("work_orders").insert({
      id: woId,
      work_order_number: woNumber,
      org_id: plan.org_id,
      asset_id: plan.asset_id,
      site_id: plan.site_id,
      building_id: plan.building_id,
      floor_id: plan.floor_id,
      room_id: plan.room_id,
      vendor_id: plan.vendor_id,
      service_category_id: plan.service_category_id,
      service_type_id: plan.service_type_id,
      title: `PM: ${plan.plan_number} - ${s.scheduled_date}`,
      description: `Auto-generated preventive maintenance work order for PM Plan ${plan.plan_number}`,
      priority: plan.priority,
      status: "open",
      created_by: claims.sub,
      created_at: now
    });

    if (woErr) {
      log.error({ correlationId, sched_id: s.id, err: woErr.message }, "Failed to generate WO");
      continue;
    }

    // Update schedule
    await db.from("pm_schedules").update({
      status: "work_order_created",
      generated_work_order_id: woId,
      updated_at: now
    }).eq("id", s.id);

    generatedWos.push(woId);

    await publishEvent({ event_name: "pm.workorder.generated" as never, payload: { schedule_id: s.id, work_order_id: woId, plan_id: s.pm_plan_id }, org_id: plan.org_id, correlation_id: correlationId, source_function: FUNCTION_NAME });
  }

  if (generatedWos.length > 0) {
    log.info({ correlationId, count: generatedWos.length }, "Batch PM generation complete");
  }

  return { generated_count: generatedWos.length, work_orders: generatedWos, status: "success" };
}
