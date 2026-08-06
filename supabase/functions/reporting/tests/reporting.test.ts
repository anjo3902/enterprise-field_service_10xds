/**
 * reporting/tests/reporting.test.ts
 */

import { assertEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";

Deno.test("efn-report-operational schema validation", async () => {
  const { OperationalReportSchema } = await import("../efn-report-operational/schema.ts");
  const payload = {
    org_id: generateUuid(),
    start_date: "2026-01-01T00:00:00.000Z",
    limit: 10
  };

  const result = OperationalReportSchema.safeParse(payload);
  assertEquals(result.success, true);
});

Deno.test("efn-report-export schema validation", async () => {
  const { ExportSchema } = await import("../efn-report-export/schema.ts");
  const payload = {
    action: "export_report",
    report_type: "financial",
    export_format: "excel",
  };

  const result = ExportSchema.safeParse(payload);
  assertEquals(result.success, true);
});

Deno.test("efn-report-dashboard schema validation", async () => {
  const { DashboardSchema } = await import("../efn-report-dashboard/schema.ts");
  const payload = {
    dashboard_type: "org_executive",
    reporting_date: "2026-07-20"
  };

  const result = DashboardSchema.safeParse(payload);
  assertEquals(result.success, true);
});

Deno.test("efn-report-inventory schema invalidation", async () => {
  const { InventoryReportSchema } = await import("../efn-report-inventory/schema.ts");
  const payload = {
    limit: 1000 // exceeds max 500
  };

  const result = InventoryReportSchema.safeParse(payload);
  assertEquals(result.success, false);
});
