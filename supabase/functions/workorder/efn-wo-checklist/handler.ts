/**
 * workorder/efn-wo-checklist/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles three checklist actions:
 *  seed        – Copy a checklist_template onto a work order (create tasks)
 *  respond     – Capture technician response for a checklist_item
 *  complete_item – Mark a work_order_task as completed and check mandatory gate
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { ChecklistResult } from "./types.ts";
import type { ChecklistActionInput } from "./schema.ts";

const FUNCTION_NAME = "efn-wo-checklist";

export async function handleChecklist(
  body:          ChecklistActionInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<ChecklistResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Work Order ────────────────────────────────────────────
  const { data: wo, error: fetchErr } = await db
    .from("work_orders")
    .select("org_id, vendor_id, technician_id, status")
    .eq("id", body.work_order_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !wo) throw new NotFoundError("Work Order", correlationId);
  const w = wo as Record<string, string | null>;

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== w["org_id"]) {
      throw new ForbiddenError("Cannot access checklist for a work order in a different organization", correlationId);
    }
    if (claims.vendor_id && claims.vendor_id !== w["vendor_id"]) {
      throw new ForbiddenError("Your vendor is not assigned to this work order", correlationId);
    }
    if (claims.app_role === "technician" && w["technician_id"] !== claims.sub) {
      throw new ForbiddenError("You are not the assigned technician for this work order", correlationId);
    }
  }

  // ── 3. Action Dispatch ────────────────────────────────────────────
  if (body.action === "seed") {
    // Load template items
    const { data: items, error: itemsErr } = await db
      .from("checklist_items")
      .select("id, item_label, response_type, is_required, sequence")
      .eq("template_id", body.template_id)
      .order("sequence", { ascending: true });

    if (itemsErr || !items || items.length === 0) {
      throw new NotFoundError("Checklist template items", correlationId);
    }

    // Also create work_order_tasks for each required item
    const taskInserts = (items as Record<string, unknown>[]).map((item) => ({
      id:            generateUuid(),
      work_order_id: body.work_order_id,
      task_name:     item["item_label"] as string,
      sequence:      item["sequence"] as number,
      is_mandatory:  item["is_required"] as boolean,
      is_completed:  false,
      created_by:    claims.sub,
      created_at:    now,
    }));

    const { error: taskErr } = await db.from("work_order_tasks").insert(taskInserts);
    if (taskErr) throw new Error(`Checklist seed failed: ${taskErr.message}`);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: w["org_id"],
      entity_type: "work_order", entity_id: body.work_order_id, action: "CHECKLIST_SEED",
      new_value: { template_id: body.template_id, item_count: items.length },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    log.info({ correlationId, work_order_id: body.work_order_id, items: items.length }, "Checklist seeded");
    return { work_order_id: body.work_order_id, action: "seed", total_items: items.length, done_items: 0 };

  } else if (body.action === "respond") {
    // Upsert checklist response
    const { error: upsertErr } = await db.from("work_order_checklist_responses").upsert({
      id:                generateUuid(),
      work_order_id:     body.work_order_id,
      checklist_item_id: body.checklist_item_id,
      value:             body.value,
      remarks:           body.remarks ?? null,
      completed_by:      claims.sub,
      completed_at:      now,
    }, { onConflict: "work_order_id,checklist_item_id" });

    if (upsertErr) throw new Error(`Checklist response failed: ${upsertErr.message}`);

    log.info({ correlationId, item_id: body.checklist_item_id }, "Checklist response recorded");
    return { work_order_id: body.work_order_id, action: "respond", item_id: body.checklist_item_id };

  } else if (body.action === "complete_item") {
    // Mark work_order_task as completed
    const { data: task, error: taskErr } = await db
      .from("work_order_tasks")
      .select("id, is_completed, is_mandatory")
      .eq("id", body.task_id)
      .eq("work_order_id", body.work_order_id)
      .maybeSingle();

    if (taskErr || !task) throw new NotFoundError("Work Order Task", correlationId);
    const tk = task as Record<string, unknown>;

    if (tk["is_completed"]) {
      throw new ValidationError("Task is already completed", correlationId);
    }

    await db.from("work_order_tasks").update({
      is_completed: true,
      completed_by: claims.sub,
      completed_at: now,
      updated_at:   now,
    }).eq("id", body.task_id);

    // Count mandatory completion status
    const { data: allTasks } = await db
      .from("work_order_tasks")
      .select("is_mandatory, is_completed")
      .eq("work_order_id", body.work_order_id);

    const tasks       = (allTasks ?? []) as Record<string, boolean>[];
    const total       = tasks.length;
    const done        = tasks.filter((t) => t["is_completed"]).length;
    const mandatoryLeft = tasks.filter((t) => t["is_mandatory"] && !t["is_completed"]).length;

    if (mandatoryLeft === 0 && total > 0) {
      await publishEvent({
        event_name:      "workorder.checklist.completed" as never,
        payload:         { work_order_id: body.work_order_id, total_tasks: total, done_tasks: done + 1 },
        org_id:          w["org_id"] as string,
        correlation_id:  correlationId,
        source_function: FUNCTION_NAME,
      });
    }

    log.info({ correlationId, task_id: body.task_id, done, total }, "Task completed");
    return {
      work_order_id: body.work_order_id,
      action: "complete_item",
      item_id: body.task_id,
      completed: true,
      total_items: total,
      done_items: done + 1,
      all_mandatory_done: mandatoryLeft === 0,
    };
  }

  // TypeScript exhaustive guard
  throw new Error("Unknown checklist action");
}
