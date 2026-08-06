/**
 * reporting/efn-report-inventory/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Retrieves inventory valuation, consumption trends, and stock alerts.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { InventoryReportResult } from "./types.ts";
import type { InventoryReportInput } from "./schema.ts";

const FUNCTION_NAME = "efn-report-inventory";

export async function handleInventoryReport(
  body:          InventoryReportInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<InventoryReportResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  const orgId = claims.is_platform_admin ? (body.org_id ?? claims.org_id) : claims.org_id;
  if (!orgId) throw new ForbiddenError("org_id is required", correlationId);

  // Since there's no pre-aggregated inventory_analytics table, we query the warehouse_stock directly.
  // We join inventory_items to get valuation (quantity_on_hand * unit_cost).
  const { data, count, error } = await db.from("warehouse_stock")
    .select("*, warehouses!inner(org_id), inventory_items!inner(item_name, unit_cost, reorder_point, stock_status)", { count: "exact" })
    .eq("warehouses.org_id", orgId)
    .range(body.offset!, body.offset! + body.limit! - 1);

  if (error) throw new Error(error.message);

  const enrichedData = (data ?? []).map(row => {
    const unitCost = row.inventory_items?.unit_cost ?? 0;
    const valuation = Number(row.quantity_on_hand) * Number(unitCost);
    return {
      ...row,
      valuation
    };
  });

  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: orgId,
    entity_type: "report", action: "REPORT_GENERATED",
    new_value: { report_type: "inventory", filters: body }, timestamp: now
  });

  await publishEvent({ event_name: "report.generated" as never, payload: { report_type: "inventory", filters: body }, org_id: orgId, correlation_id: correlationId, source_function: FUNCTION_NAME });

  log.info({ correlationId, orgId, count }, "Inventory report generated");

  return {
    org_id: orgId,
    reporting_period: `${body.start_date ?? 'all'} to ${body.end_date ?? 'now'}`,
    data: enrichedData,
    total: count ?? 0,
  };
}
