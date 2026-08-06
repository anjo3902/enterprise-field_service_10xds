/**
 * notifications/efn-notification-template/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles CRUD operations for notification templates.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { NotFoundError, ValidationError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { TemplateResult } from "./types.ts";
import type { TemplateInput } from "./schema.ts";

const FUNCTION_NAME = "efn-notification-template";

export async function handleNotificationTemplate(
  body:          TemplateInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<TemplateResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  if (body.action === "create") {
    if (!body.template_code || !body.name || !body.channel || !body.body) {
      throw new ValidationError("template_code, name, channel, and body are required for create", correlationId);
    }
    const newId = generateUuid();
    
    await db.from("notification_templates").insert({
      id: newId, template_code: body.template_code, name: body.name, channel: body.channel,
      subject: body.subject, body: body.body, variables: body.variables ?? [], language: body.language ?? "en",
      created_by: claims.sub, created_at: now
    });

    log.info({ correlationId, templateId: newId }, "Notification template created");
    return { action: "create", id: newId, code: body.template_code, channel: body.channel, status: "active" };

  } else if (body.action === "update") {
    if (!body.id) throw new ValidationError("id is required for update", correlationId);
    
    const { data: existing } = await db.from("notification_templates").select("*").eq("id", body.id).maybeSingle();
    if (!existing) throw new NotFoundError("Template", correlationId);

    const updatePayload: any = { updated_by: claims.sub, updated_at: now, version: existing.version + 1 };
    if (body.name) updatePayload.name = body.name;
    if (body.subject) updatePayload.subject = body.subject;
    if (body.body) updatePayload.body = body.body;
    if (body.variables) updatePayload.variables = body.variables;
    if (body.language) updatePayload.language = body.language;

    await db.from("notification_templates").update(updatePayload).eq("id", body.id);
    
    log.info({ correlationId, templateId: body.id }, "Notification template updated");
    return { action: "update", id: body.id, code: existing.template_code, channel: existing.channel, status: "active" };

  } else if (body.action === "delete") {
    if (!body.id) throw new ValidationError("id is required for delete", correlationId);
    
    const { data: existing } = await db.from("notification_templates").select("*").eq("id", body.id).maybeSingle();
    if (!existing) throw new NotFoundError("Template", correlationId);

    await db.from("notification_templates").update({ deleted_at: now, updated_by: claims.sub }).eq("id", body.id);
    
    log.info({ correlationId, templateId: body.id }, "Notification template deleted");
    return { action: "delete", id: body.id, code: existing.template_code, channel: existing.channel, status: "deleted" };
  }
  
  throw new Error("Invalid action");
}
