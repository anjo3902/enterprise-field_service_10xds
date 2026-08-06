/**
 * workorder/efn-wo-history/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Returns the full operational history of a work order via parallel queries.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { WoHistoryResult } from "./types.ts";
import type { WoHistoryInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-wo-history";

export async function getWoHistory(
  body:          WoHistoryInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<WoHistoryResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Load Work Order ────────────────────────────────────────────
  const { data: wo, error: fetchErr } = await db
    .from("work_orders")
    .select("org_id, vendor_id, technician_id, work_order_number")
    .eq("id", body.work_order_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !wo) throw new NotFoundError("Work Order", correlationId);
  const w = wo as Record<string, string | null>;

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== w["org_id"]) {
      throw new ForbiddenError("Cannot view history for a work order in a different organization", correlationId);
    }
    if (claims.vendor_id && claims.vendor_id !== w["vendor_id"]) {
      throw new ForbiddenError("Your vendor is not assigned to this work order", correlationId);
    }
  }

  const inc = body.include!;

  // ── 3. Parallel Data Fetch ────────────────────────────────────────
  const [tasksData, laborData, partsData, checklistData, activityData] = await Promise.all([
    inc.includes("tasks")
      ? db.from("work_order_tasks").select("*").eq("work_order_id", body.work_order_id).order("sequence")
      : Promise.resolve({ data: [], error: null }),
    inc.includes("labor")
      ? db.from("work_order_labor").select("*").eq("work_order_id", body.work_order_id)
      : Promise.resolve({ data: [], error: null }),
    inc.includes("parts")
      ? db.from("work_order_parts_used").select("*").eq("work_order_id", body.work_order_id)
      : Promise.resolve({ data: [], error: null }),
    inc.includes("checklist")
      ? db.from("work_order_checklist_responses").select("*").eq("work_order_id", body.work_order_id)
      : Promise.resolve({ data: [], error: null }),
    inc.includes("activity")
      ? db.from("activity_timeline").select("*").eq("entity_id", body.work_order_id)
          .eq("entity_type", "work_order").order("occurred_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  log.info({ correlationId, work_order_id: body.work_order_id }, "WO history fetched");

  const mapRow = <T>(data: unknown[] | null, fn: (r: Record<string, unknown>) => T): T[] =>
    (data ?? []).map((r) => fn(r as Record<string, unknown>));

  return {
    work_order_id:     body.work_order_id,
    work_order_number: w["work_order_number"] as string,
    tasks: mapRow(tasksData.data, (r) => ({
      id: r["id"] as string, task_name: r["task_name"] as string,
      is_mandatory: r["is_mandatory"] as boolean, is_completed: r["is_completed"] as boolean,
      completed_by: r["completed_by"] as string | null, completed_at: r["completed_at"] as string | null,
    })),
    labor: mapRow(laborData.data, (r) => ({
      id: r["id"] as string, technician_id: r["technician_id"] as string,
      hours_worked: r["hours_worked"] as number, travel_time_hours: r["travel_time_hours"] as number,
      overtime_hours: r["overtime_hours"] as number, labor_cost: r["labor_cost"] as number | null,
    })),
    parts: mapRow(partsData.data, (r) => ({
      id: r["id"] as string, part_name: r["part_name"] as string, part_number: r["part_number"] as string | null,
      quantity: r["quantity"] as number, unit_cost: r["unit_cost"] as number | null, total_cost: r["total_cost"] as number | null,
    })),
    checklist: mapRow(checklistData.data, (r) => ({
      id: r["id"] as string, checklist_item_id: r["checklist_item_id"] as string,
      value: r["value"] as string | null, remarks: r["remarks"] as string | null,
      completed_by: r["completed_by"] as string | null, completed_at: r["completed_at"] as string | null,
    })),
    activity: mapRow(activityData.data, (r) => ({
      id: r["id"] as string, activity_type: r["activity_type"] as string,
      description: r["description"] as string, performed_by_id: r["performed_by_id"] as string | null,
      occurred_at: r["occurred_at"] as string,
    })),
  };
}
