/**
 * maintenance/efn-pm-schedule/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles generation, skipping, and rescheduling of PM schedules.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { PmScheduleResult } from "./types.ts";
import type { PmScheduleInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-pm-schedule";

// Simplified frequency mapping (adds days)
const addFreq = (date: Date, freq: string): Date => {
  const d = new Date(date);
  switch (freq) {
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "semi_annual": d.setMonth(d.getMonth() + 6); break;
    case "annual": d.setFullYear(d.getFullYear() + 1); break;
    default: break; // custom/one_time not incremented here for MVP
  }
  return d;
};

export async function handlePmSchedule(
  body:          PmScheduleInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<PmScheduleResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  if (body.action === "generate") {
    const { data: plan } = await db.from("pm_plans").select("id, org_id, frequency, next_due_date, end_date, status").eq("id", body.plan_id).maybeSingle();
    if (!plan) throw new NotFoundError("PM Plan", correlationId);
    
    if (plan.status !== "active") throw new Error("Plan is not active");

    if (!claims.is_platform_admin) {
      if (plan["org_id"] !== claims.org_id) throw new ForbiddenError("Cannot generate schedules for another organization", correlationId);
    }

    let current = new Date(plan["next_due_date"] as string);
    const target = new Date(body.target_date!);
    const maxEnd = plan["end_date"] ? new Date(plan["end_date"] as string) : target;
    const finalEnd = new Date(Math.min(target.getTime(), maxEnd.getTime()));
    
    const freq = plan["frequency"] as string;
    if (freq === "one_time") {
      // just generate once if within bounds
      if (current <= finalEnd) {
        const schedId = generateUuid();
        await db.from("pm_schedules").insert({
          id: schedId, pm_plan_id: plan.id, scheduled_date: current.toISOString().split("T")[0],
          status: "requested", created_by: claims.sub, created_at: now
        });
        await db.from("pm_plans").update({ next_due_date: null, updated_at: now }).eq("id", plan.id);
        await publishEvent({ event_name: "pm.schedule.generated" as never, payload: { plan_id: plan.id, schedule_ids: [schedId] }, org_id: plan["org_id"] as string, correlation_id: correlationId, source_function: FUNCTION_NAME });
        return { action: "generate", schedule_ids: [schedId], status: "success" };
      }
      return { action: "generate", schedule_ids: [], status: "success" };
    }

    const newSchedules: any[] = [];
    while (current <= finalEnd) {
      newSchedules.push({
        id: generateUuid(),
        pm_plan_id: plan.id,
        scheduled_date: current.toISOString().split("T")[0],
        status: "requested",
        created_by: claims.sub,
        created_at: now
      });
      current = addFreq(current, freq);
    }

    if (newSchedules.length > 0) {
      await db.from("pm_schedules").insert(newSchedules);
      await db.from("pm_plans").update({ next_due_date: current.toISOString().split("T")[0], updated_at: now }).eq("id", plan.id);
      
      await db.from("audit_logs").insert({
        id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: plan["org_id"] as string,
        entity_type: "pm_plan", entity_id: plan.id, action: "GENERATE_SCHEDULES",
        new_value: { count: newSchedules.length, next_due_date: current.toISOString().split("T")[0] },
        ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
      });

      const schedIds = newSchedules.map(s => s.id);
      await publishEvent({ event_name: "pm.schedule.generated" as never, payload: { plan_id: plan.id, schedule_ids: schedIds }, org_id: plan["org_id"] as string, correlation_id: correlationId, source_function: FUNCTION_NAME });
      log.info({ correlationId, generatedCount: newSchedules.length }, "Schedules generated");
      return { action: "generate", schedule_ids: schedIds, status: "success" };
    }

    return { action: "generate", schedule_ids: [], status: "success" };
  } else {
    // skip or reschedule
    const { data: sched } = await db.from("pm_schedules").select("id, status, pm_plan_id").eq("id", body.schedule_id).maybeSingle();
    if (!sched) throw new NotFoundError("PM Schedule", correlationId);

    const { data: plan } = await db.from("pm_plans").select("org_id").eq("id", sched.pm_plan_id).single();

    if (!claims.is_platform_admin) {
      if (plan!["org_id"] !== claims.org_id) throw new ForbiddenError("Permission denied", correlationId);
    }

    if (["completed", "cancelled", "missed"].includes(sched.status)) {
      throw new Error(`Cannot modify a schedule in ${sched.status} state`);
    }

    if (body.action === "skip") {
      await db.from("pm_schedules").update({ status: "cancelled", skipped_reason: body.reason, updated_by: claims.sub, updated_at: now }).eq("id", body.schedule_id);
      
      // record exception
      await db.from("pm_exceptions").insert({
        pm_schedule_id: body.schedule_id, exception_type: "skip_request", reason: body.reason!, status: "approved",
        approved_by_id: claims.sub, approved_at: now, created_by: claims.sub, created_at: now
      });

      await db.from("audit_logs").insert({
        id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: plan!["org_id"] as string,
        entity_type: "pm_schedule", entity_id: body.schedule_id!, action: "SKIP",
        new_value: { reason: body.reason }, ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
      });

      log.info({ correlationId, schedule_id: body.schedule_id }, "Schedule skipped");
      return { action: "skip", schedule_id: body.schedule_id, status: "cancelled" };

    } else {
      // reschedule
      await db.from("pm_schedules").update({ status: "rescheduled", scheduled_date: body.new_date, updated_by: claims.sub, updated_at: now }).eq("id", body.schedule_id);

      // record exception
      await db.from("pm_exceptions").insert({
        pm_schedule_id: body.schedule_id, exception_type: "reschedule_request", reason: body.reason!, requested_reschedule_date: body.new_date, status: "approved",
        approved_by_id: claims.sub, approved_at: now, created_by: claims.sub, created_at: now
      });

      await db.from("audit_logs").insert({
        id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: plan!["org_id"] as string,
        entity_type: "pm_schedule", entity_id: body.schedule_id!, action: "RESCHEDULE",
        new_value: { new_date: body.new_date, reason: body.reason }, ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
      });

      log.info({ correlationId, schedule_id: body.schedule_id, new_date: body.new_date }, "Schedule rescheduled");
      return { action: "reschedule", schedule_id: body.schedule_id, status: "rescheduled" };
    }
  }
}
