/**
 * notifications/efn-notification-history/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Retrieves the history of notifications.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { HistoryResult } from "./types.ts";
import type { HistoryInput } from "./schema.ts";

const FUNCTION_NAME = "efn-notification-history";

export async function getHistory(
  body:          HistoryInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<HistoryResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // If a regular user, they can only see their own history
  const targetRecipientId = claims.is_platform_admin ? (body.recipient_id ?? claims.sub) : claims.sub;

  const { data, count, error } = await db.from("notifications")
    .select("*", { count: "exact" })
    .eq("recipient_profile_id", targetRecipientId)
    .order("created_at", { ascending: false })
    .range(body.offset!, body.offset! + body.limit! - 1);

  if (error) throw new Error(error.message);

  log.info({ correlationId, recipient_id: targetRecipientId, count }, "Notification history retrieved");

  return {
    action: "get_history",
    data: data ?? [],
    total: count ?? 0,
  };
}
