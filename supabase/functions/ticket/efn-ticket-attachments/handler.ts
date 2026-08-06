/**
 * ticket/efn-ticket-attachments/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles ticket-evidence bucket integration.
 * Generates signed upload URLs and removes attachments.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { AttachmentResult } from "./types.ts";
import type { AttachmentActionInput } from "./schema.ts";

const FUNCTION_NAME = "efn-ticket-attachments";
const BUCKET_NAME   = "ticket-evidence";

export async function handleAttachment(
  body:          AttachmentActionInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<AttachmentResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Ticket for Scoping ────────────────────────────────────
  const { data: ticket, error: tErr } = await db
    .from("tickets")
    .select("org_id, vendor_id")
    .eq("id", body.ticket_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (tErr || !ticket) throw new NotFoundError("Ticket", correlationId);
  const t = ticket as Record<string, string | null>;

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== t["org_id"]) {
      throw new ForbiddenError("Cannot upload to a ticket in a different organization", correlationId);
    }
    if (claims.vendor_id && claims.vendor_id !== t["vendor_id"]) {
      throw new ForbiddenError("Your vendor is not assigned to this ticket", correlationId);
    }
  }

  let result: AttachmentResult = { ticket_id: body.ticket_id, action: body.action };

  if (body.action === "upload_url") {
    // ── 3a. Generate Storage Path ──────────────────────────────────
    const safeName   = body.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const attachId   = generateUuid();
    const storagePath = `${t["org_id"]}/${body.ticket_id}/${attachId}_${safeName}`;

    // ── 3b. Create Signed Upload URL (15 min) ─────────────────────
    const { data: uploadData, error: urlErr } = await db.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(storagePath);

    if (urlErr) throw new Error(`Signed URL generation failed: ${urlErr.message}`);

    // ── 3c. Pre-register Attachment Row ───────────────────────────
    const { error: insertErr } = await db.from("ticket_attachments").insert({
      id:              attachId,
      ticket_id:       body.ticket_id,
      storage_path:    storagePath,
      file_name:       body.file_name,
      mime_type:       body.mime_type,
      file_size_bytes: body.file_size_bytes,
      attachment_type: body.attachment_type ?? null,
      uploaded_by:     claims.sub,
      created_at:      now,
    });

    if (insertErr) throw new Error(`Attachment record failed: ${insertErr.message}`);

    result = { ...result, attachment_id: attachId, url: uploadData.signedUrl, storage_path: storagePath };

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: t["org_id"],
      entity_type: "ticket", entity_id: body.ticket_id, action: "ATTACHMENT_UPLOAD",
      new_value: { attachment_id: attachId, file: safeName, mime_type: body.mime_type },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({
      event_name:      "ticket.attachment.uploaded" as never,
      payload:         { ticket_id: body.ticket_id, attachment_id: attachId, mime_type: body.mime_type },
      org_id:          t["org_id"] as string,
      correlation_id:  correlationId,
      source_function: FUNCTION_NAME,
    });

  } else if (body.action === "delete") {
    // ── 4. Load and Delete Attachment ──────────────────────────────
    const { data: att, error: attErr } = await db
      .from("ticket_attachments")
      .select("storage_path, uploaded_by")
      .eq("id", body.attachment_id)
      .maybeSingle();

    if (attErr || !att) throw new NotFoundError("Attachment", correlationId);
    const a = att as Record<string, string>;

    // Only uploader or admin can delete
    if (!claims.is_platform_admin && a["uploaded_by"] !== claims.sub) {
      throw new ForbiddenError("You can only delete your own attachments", correlationId);
    }

    // Delete from storage
    await db.storage.from(BUCKET_NAME).remove([a["storage_path"]]);
    // Delete DB record
    await db.from("ticket_attachments").delete().eq("id", body.attachment_id);

    result = { ...result, attachment_id: body.attachment_id, storage_path: a["storage_path"] };

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: t["org_id"],
      entity_type: "ticket", entity_id: body.ticket_id, action: "ATTACHMENT_DELETE",
      old_value: { attachment_id: body.attachment_id },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });
  }

  log.info({ correlationId, ticket_id: body.ticket_id, action: body.action }, "Attachment handled");
  return result;
}
