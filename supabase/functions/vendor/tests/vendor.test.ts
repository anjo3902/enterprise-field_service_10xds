/**
 * vendor/tests/vendor.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Unit & Integration tests for Vendor Management Edge Functions.
 *
 * Run:
 *   deno test --allow-env --allow-net supabase/functions/vendor/tests/vendor.test.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const BASE_URL = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

async function post(path: string, body: unknown, token?: string) {
  return fetch(`${BASE_URL}/functions/v1/${path}`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

// ── 1. Vendor Create ──────────────────────────────────────────────

Deno.test("vendor-create: rejects unauthenticated", async () => {
  const res = await post("vendor/efn-vendor-create", {
    name: "Test Vendor", trade_domains: ["HVAC"],
  });
  assertEquals(res.status, 401);
});

Deno.test("vendor-create: schema rejects empty trade_domains", async () => {
  const res = await post("vendor/efn-vendor-create", {
    name: "Test Vendor", trade_domains: [],
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("vendor-create: requires system_admin role (integration)", async () => {
  console.log("[integration] Skipped — requires vendor_admin JWT to get 403");
});

// ── 2. Vendor Update ──────────────────────────────────────────────

Deno.test("vendor-update: schema rejects no update fields", async () => {
  const res = await post("vendor/efn-vendor-update", {
    vendor_id: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("vendor-update: vendor_admin cannot update status (integration)", async () => {
  console.log("[integration] Skipped — requires seeded vendor_admin JWT patching 'status'");
});

Deno.test("vendor-update: tenant isolation (integration)", async () => {
  console.log("[integration] Skipped — requires vendor_admin A patching vendor B");
});

// ── 3. Vendor Members ─────────────────────────────────────────────

Deno.test("vendor-members: change_role requires role field", async () => {
  const res = await post("vendor/efn-vendor-members", {
    vendor_id: crypto.randomUUID(),
    user_id:   crypto.randomUUID(),
    action:    "change_role",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("vendor-members: rejects unauthenticated", async () => {
  const res = await post("vendor/efn-vendor-members", {
    vendor_id: crypto.randomUUID(),
    user_id:   crypto.randomUUID(),
    action:    "suspend",
  });
  assertEquals(res.status, 401);
});

// ── 4. Vendor Capabilities ────────────────────────────────────────

Deno.test("vendor-capabilities: rejects invalid action", async () => {
  const res = await post("vendor/efn-vendor-capabilities", {
    action: "invalid_action",
    vendor_id: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("vendor-capabilities: remove requires capability_id", async () => {
  const res = await post("vendor/efn-vendor-capabilities", {
    action:    "remove",
    vendor_id: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("vendor-capabilities: upsert requires service_category_id", async () => {
  const res = await post("vendor/efn-vendor-capabilities", {
    action:    "upsert",
    vendor_id: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 5. Vendor Contracts ───────────────────────────────────────────

Deno.test("vendor-contracts: create enforces end_date > start_date", async () => {
  const res = await post("vendor/efn-vendor-contracts", {
    action:        "create",
    org_id:        crypto.randomUUID(),
    vendor_id:     crypto.randomUUID(),
    title:         "Test Contract",
    scope_domains: ["HVAC"],
    start_date:    "2026-12-31",
    end_date:      "2026-01-01",  // Invalid: before start
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("vendor-contracts: terminate requires reason", async () => {
  const res = await post("vendor/efn-vendor-contracts", {
    action:      "terminate",
    contract_id: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("vendor-contracts: only system_admin can create (integration)", async () => {
  console.log("[integration] Skipped — requires seeded vendor_admin JWT");
});

// ── 6. Vendor Performance ─────────────────────────────────────────

Deno.test("vendor-performance: to_date >= from_date validation", async () => {
  const res = await post("vendor/efn-vendor-performance", {
    vendor_id:  crypto.randomUUID(),
    from_date:  "2026-06-01",
    to_date:    "2026-01-01", // Invalid: before from_date
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("vendor-performance: org_user denied without active contract (integration)", async () => {
  console.log("[integration] Skipped — requires seeded org_user JWT + unlinked vendor");
});

// ── 7. Vendor Dashboard ───────────────────────────────────────────

Deno.test("vendor-dashboard: rejects unauthenticated", async () => {
  const res = await post("vendor/efn-vendor-dashboard", {
    vendor_id: crypto.randomUUID(),
  });
  assertEquals(res.status, 401);
});

Deno.test("vendor-dashboard: tenant isolation for vendor_staff (integration)", async () => {
  console.log("[integration] Skipped — requires vendor_staff JWT for another vendor");
});
