/**
 * maintenance/efn-inspection/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles checklist templates and work order responses.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { InspectionResult } from "./types.ts";
import type { InspectionInput } from "./schema.ts";

const FUNCTION_NAME = "efn-inspection";

export async function handleInspection(
  body:          InspectionInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<InspectionResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  if (body.action === "create_template") {
    if (!claims.org_id && !claims.is_platform_admin) throw new ForbiddenError("Permission denied", correlationId);
    
    const orgId = claims.is_platform_admin && body.service_type_id ? claims.org_id /* simplified fallback */ : claims.org_id;

    const templateId = generateUuid();
    const { error: insErr } = await db.from("checklist_templates").insert({
      id:              templateId,
      org_id:          orgId,
      service_type_id: body.service_type_id ?? null,
      name:            body.name,
      description:     body.description ?? null,
      status:          "active",
      created_by:      claims.sub,
      created_at:      now,
    });
    if (insErr) throw new Error(`Template insert failed: ${insErr.message}`);

    const items = body.items.map(item => ({
      id:            generateUuid(),
      template_id:   templateId,
      item_label:    item.item_label,
      response_type: item.response_type,
      is_required:   item.is_required,
      sequence:      item.sequence,
      created_at:    now,
    }));
    await db.from("checklist_items").insert(items);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: orgId!,
      entity_type: "checklist_template", entity_id: templateId, action: "CREATE",
      new_value: { name: body.name, items_count: items.length },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    log.info({ correlationId, templateId }, "Checklist template created");
    return { action: "create_template", template_id: templateId, status: "active" };

  } else {
    // submit_responses
    const { data: wo } = await db.from("work_orders").select("org_id, vendor_id").eq("id", body.work_order_id).maybeSingle();
    if (!wo) throw new NotFoundError("Work Order", correlationId);

    // Techs can only submit if they have access to the org/vendor of the WO
    if (!claims.is_platform_admin) {
      if (claims.org_id && wo["org_id"] !== claims.org_id) throw new ForbiddenError("Permission denied", correlationId);
      if (claims.vendor_id && wo["vendor_id"] !== claims.vendor_id) throw new ForbiddenError("Permission denied", correlationId);
    }

    const responses = body.responses.map(r => ({
      id:                generateUuid(),
      work_order_id:     body.work_order_id,
      checklist_item_id: r.checklist_item_id,
      value:             r.value ?? null,
      remarks:           r.remarks ?? null,
      completed_by:      claims.sub,
      completed_at:      now,
    }));

    // Upsert to handle re-submissions
    const { error: resErr } = await db.from("work_order_checklist_responses").upsert(
      responses, 
      { onConflict: "work_order_id,checklist_item_id" }
    );
    if (resErr) throw new Error(`Response insert failed: ${resErr.message}`);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: wo["org_id"] as string,
      entity_type: "work_order", entity_id: body.work_order_id, action: "SUBMIT_INSPECTION",
      new_value: { responses_count: responses.length },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({ event_name: "pm.inspection.completed" as never, payload: { work_order_id: body.work_order_id }, org_id: wo["org_id"] as string, correlation_id: correlationId, source_function: FUNCTION_NAME });

    log.info({ correlationId, work_order_id: body.work_order_id }, "Inspection responses submitted");
    return { action: "submit_responses", work_order_id: body.work_order_id, status: "completed" };
  }
}
