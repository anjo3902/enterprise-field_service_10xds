/**
 * ticket/efn-ticket-comments/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Add, edit, or soft-delete ticket comments.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { CommentResult } from "./types.ts";
import type { CommentActionInput } from "./schema.ts";

const FUNCTION_NAME = "efn-ticket-comments";

export async function handleComment(
  body:          CommentActionInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<CommentResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Ticket for Scoping ────────────────────────────────────
  const { data: ticket, error: tErr } = await db
    .from("tickets")
    .select("org_id, vendor_id, assigned_technician_id")
    .eq("id", body.ticket_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (tErr || !ticket) throw new NotFoundError("Ticket", correlationId);
  const t = ticket as Record<string, string | null>;

  // ── 2. Tenant Access Control ──────────────────────────────────────
  if (!claims.is_platform_admin) {
    if (claims.org_id && claims.org_id !== t["org_id"]) {
      throw new ForbiddenError("Cannot comment on a ticket in a different organization", correlationId);
    }
    if (claims.vendor_id && claims.vendor_id !== t["vendor_id"]) {
      throw new ForbiddenError("Your vendor is not assigned to this ticket", correlationId);
    }
  }

  let resultCommentId = "";

  if (body.action === "add") {
    resultCommentId = generateUuid();
    const { error: insertErr } = await db.from("ticket_comments").insert({
      id:           resultCommentId,
      ticket_id:    body.ticket_id,
      body:         body.body,
      comment_type: body.comment_type,
      visibility:   body.visibility,
      author_id:    claims.sub,
      created_at:   now,
    });
    if (insertErr) throw new Error(`Comment insert failed: ${insertErr.message}`);
  } else if (body.action === "edit") {
    resultCommentId = body.comment_id;
    // Only author or admin can edit
    const { data: existing } = await db.from("ticket_comments").select("author_id").eq("id", body.comment_id).maybeSingle();
    const ex = existing as Record<string, string> | null;
    if (!claims.is_platform_admin && ex?.["author_id"] !== claims.sub) {
      throw new ForbiddenError("You can only edit your own comments", correlationId);
    }
    const { error: editErr } = await db.from("ticket_comments")
      .update({ body: body.body, updated_at: now })
      .eq("id", body.comment_id);
    if (editErr) throw new Error(`Comment edit failed: ${editErr.message}`);
  } else if (body.action === "delete") {
    resultCommentId = body.comment_id;
    const { data: existing } = await db.from("ticket_comments").select("author_id").eq("id", body.comment_id).maybeSingle();
    const ex = existing as Record<string, string> | null;
    if (!claims.is_platform_admin && ex?.["author_id"] !== claims.sub) {
      throw new ForbiddenError("You can only delete your own comments", correlationId);
    }
    const { error: rmErr } = await db.from("ticket_comments")
      .update({ deleted_at: now })
      .eq("id", body.comment_id);
    if (rmErr) throw new Error(`Comment delete failed: ${rmErr.message}`);
  }

  // ── 3. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    org_id:      t["org_id"],
    entity_type: "ticket",
    entity_id:   body.ticket_id,
    action:      `COMMENT_${body.action.toUpperCase()}`,
    new_value:   { comment_id: resultCommentId },
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
  });

  if (body.action === "add") {
    await publishEvent({
      event_name:      "ticket.comment.added" as never,
      payload:         { ticket_id: body.ticket_id, comment_id: resultCommentId, author: claims.sub },
      org_id:          t["org_id"] as string,
      correlation_id:  correlationId,
      source_function: FUNCTION_NAME,
    });
  }

  log.info({ correlationId, ticket_id: body.ticket_id, action: body.action }, "Comment handled");
  return { comment_id: resultCommentId, ticket_id: body.ticket_id, action: body.action };
}
