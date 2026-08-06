/**
 * ticket/efn-ticket-dashboard/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Generates aggregated ticket KPIs for the management dashboard.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { TicketDashboardResult } from "./types.ts";
import type { TicketDashboardInput }  from "./schema.ts";

const FUNCTION_NAME = "efn-ticket-dashboard";

const CLOSED_STATUSES = new Set(["closed", "cancelled", "rejected"]);
const ACTIVE_STATUSES = new Set([
  "open", "pending_vendor_review", "approved", "assigned",
  "technician_accepted", "travelling", "arrived", "checked_in",
  "on_site", "in_progress", "work_order_generated", "completed",
  "report_submitted", "vendor_review", "org_acceptance", "escalated", "reassigned"
]);

export async function getTicketDashboard(
  body:          TicketDashboardInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<TicketDashboardResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();

  // ── 1. Scope Resolution ────────────────────────────────────────────
  let targetOrgId = body.org_id;

  if (!claims.is_platform_admin) {
    if (!claims.org_id) {
      throw new ForbiddenError("Dashboard is not available for vendor/technician roles", correlationId);
    }
    if (body.org_id && body.org_id !== claims.org_id) {
      throw new ForbiddenError("Cannot view dashboard for a different organization", correlationId);
    }
    targetOrgId = claims.org_id;
  }

  if (!targetOrgId) {
    throw new ForbiddenError("org_id is required for platform admins", correlationId);
  }

  // ── 2. Load All Active Tickets ─────────────────────────────────────
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: tickets, error } = await db
    .from("tickets")
    .select("status, priority, response_sla_status, resolution_sla_status, closed_at")
    .eq("org_id", targetOrgId)
    .is("deleted_at", null);

  if (error) throw new Error(`Dashboard fetch failed: ${error.message}`);

  // ── 3. Aggregate ───────────────────────────────────────────────────
  const res: TicketDashboardResult = {
    org_id: targetOrgId,
    summary: { open: 0, in_progress: 0, pending: 0, escalated: 0, closed_today: 0, total_active: 0 },
    sla:     { response_breached: 0, resolution_breached: 0, at_risk: 0 },
    priority: { critical: 0, high: 0, medium: 0, low: 0 },
  };

  for (const tk of (tickets ?? [])) {
    const status   = tk.status as string;
    const priority = tk.priority as string;
    const resSla   = tk.response_sla_status as string | null;
    const resolvSla = tk.resolution_sla_status as string | null;
    const closedAt = tk.closed_at ? new Date(tk.closed_at as string) : null;

    // Summary counts
    if (status === "open") res.summary.open++;
    if (["in_progress", "on_site", "arrived", "checked_in", "travelling"].includes(status)) res.summary.in_progress++;
    if (["pending_vendor_review", "assigned", "technician_accepted"].includes(status)) res.summary.pending++;
    if (status === "escalated") res.summary.escalated++;
    if (closedAt && closedAt >= todayStart) res.summary.closed_today++;
    if (ACTIVE_STATUSES.has(status)) res.summary.total_active++;

    // SLA
    if (resSla === "breached")   res.sla.response_breached++;
    if (resolvSla === "breached") res.sla.resolution_breached++;
    if (resSla === "at_risk" || resolvSla === "at_risk") res.sla.at_risk++;

    // Priority
    if (priority === "Critical") res.priority.critical++;
    else if (priority === "High")   res.priority.high++;
    else if (priority === "Medium") res.priority.medium++;
    else if (priority === "Low")    res.priority.low++;
  }

  log.info({ correlationId, org_id: targetOrgId, total: (tickets ?? []).length }, "Ticket dashboard generated");
  return res;
}
