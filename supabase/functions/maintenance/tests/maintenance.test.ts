/**
 * maintenance/tests/maintenance.test.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";

// Mock helpers for testing
const mockReq = (body: any, role: string = "system_admin") => {
  return new Request("http://localhost:8000", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer mock-${role}-token`
    },
    body: JSON.stringify(body)
  });
};

Deno.test("efn-pm-plan schema validation", async () => {
  const { PmPlanSchema } = await import("../efn-pm-plan/schema.ts");
  const payload = {
    action: "create",
    org_id: generateUuid(),
    asset_id: generateUuid(),
    service_category_id: generateUuid(),
    frequency: "monthly",
    start_date: "2026-08-01",
    end_date: "2025-01-01", // Invalid, before start_date
  };

  const result = PmPlanSchema.safeParse(payload);
  assertEquals(result.success, false);
});

Deno.test("efn-pm-schedule generation validation", async () => {
  const { PmScheduleSchema } = await import("../efn-pm-schedule/schema.ts");
  const payload = {
    action: "generate",
    plan_id: generateUuid(),
    // target_date missing
  };

  const result = PmScheduleSchema.safeParse(payload);
  assertEquals(result.success, false);
});

Deno.test("efn-amc-management schema validation", async () => {
  const { AmcManagementSchema } = await import("../efn-amc-management/schema.ts");
  const payload = {
    action: "create",
    contract_number: "AMC-100",
    vendor_id: generateUuid(),
    coverage_type: "Comprehensive",
    start_date: "2026-01-01",
    end_date: "2026-12-31"
  };

  const result = AmcManagementSchema.safeParse(payload);
  assertEquals(result.success, true);
});

Deno.test("efn-warranty-management schema validation", async () => {
  const { WarrantyManagementSchema } = await import("../efn-warranty-management/schema.ts");
  const payload = {
    action: "create",
    asset_id: generateUuid(),
    warranty_number: "WAR-001",
    manufacturer: "ACME Corp",
    warranty_type: "Parts Only",
    start_date: "2026-01-01",
    end_date: "2028-01-01"
  };

  const result = WarrantyManagementSchema.safeParse(payload);
  assertEquals(result.success, true);
});

Deno.test("efn-inspection schema validation", async () => {
  const { InspectionSchema } = await import("../efn-inspection/schema.ts");
  const payload = {
    action: "create_template",
    name: "HVAC Quarterly",
    items: [
      { item_label: "Check filters", response_type: "boolean" },
      { item_label: "Notes", response_type: "text" }
    ]
  };

  const result = InspectionSchema.safeParse(payload);
  assertEquals(result.success, true);
});
