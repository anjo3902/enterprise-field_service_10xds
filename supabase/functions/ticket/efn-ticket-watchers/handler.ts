/**
 * ticket/efn-ticket-watchers/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Add or remove watchers from a ticket.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { WatcherResult } from "./types.ts";
import type { WatcherActionInput } from "./schema.ts";

const FUNCTION_NAME = "efn-ticket-watchers";

export async function handleWatcher(
  body:          WatcherActionInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<WatcherResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Ticket ─────────────────────────────────────────────────
  const { data: ticket, error: tErr } = await db
    .from("tickets")
    .select("org_id")
    .eq("id", body.ticket_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (tErr || !ticket) throw new NotFoundError("Ticket", correlationId);
  const t = ticket as Record<string, string>;

  // ── 2. Access Control ──────────────────────────────────────────────
  if (!claims.is_platform_admin && claims.org_id !== t["org_id"]) {
    throw new ForbiddenError("Cannot manage watchers on a ticket in a different organization", correlationId);
  }

  if (body.action === "add") {
    const { error: upsertErr } = await db.from("ticket_watchers").upsert({
      ticket_id:          body.ticket_id,
      profile_id:         body.profile_id,
      notification_prefs: body.notification_prefs ?? { status_changes: true, comments: true },
      added_by:           claims.sub,
      added_at:           now,
    }, { onConflict: "ticket_id,profile_id" });

    if (upsertErr) throw new Error(`Watcher add failed: ${upsertErr.message}`);
  } else {
    const { error: rmErr } = await db.from("ticket_watchers")
      .delete()
      .eq("ticket_id", body.ticket_id)
      .eq("profile_id", body.profile_id);

    if (rmErr) throw new Error(`Watcher remove failed: ${rmErr.message}`);
  }

  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: t["org_id"],
    entity_type: "ticket", entity_id: body.ticket_id,
    action: `WATCHER_${body.action.toUpperCase()}`,
    new_value: { profile_id: body.profile_id },
    timestamp: now,
  });

  log.info({ correlationId, ticket_id: body.ticket_id, action: body.action }, "Watcher handled");
  return { ticket_id: body.ticket_id, profile_id: body.profile_id, action: body.action };
}
