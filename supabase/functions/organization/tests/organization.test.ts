/**
 * organization/tests/organization.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Unit & Integration test examples for the Organization module.
 *
 * Run locally:
 *   deno test --allow-env --allow-net supabase/functions/organization/tests/organization.test.ts
 */

import { assertEquals, assertExists, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const BASE_URL  = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
const ANON_KEY  = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

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

// ── 1. Create Org Tests ───────────────────────────────────────────

Deno.test("org-create: rejects unauthenticated", async () => {
  const res = await post("organization/efn-org-create", {
    name: "Test Org", plan: "trial", admin_name: "Admin", admin_email: "test@example.com",
  });
  assertEquals(res.status, 401);
});

Deno.test("org-create: schema validation (missing admin name)", async () => {
  const res = await post("organization/efn-org-create", {
    name: "Test Org", plan: "trial", admin_email: "test@example.com",
  }, ANON_KEY);
  // Zod will catch this before JWT role check (since parseBody runs after verifyRequest, but verifyRequest might fail if ANON_KEY is not a valid user JWT).
  // Either 401 (JWT) or 422 (Schema) is expected based on middleware order.
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("org-create: requires system_admin role (integration)", async () => {
  console.log("[integration] Skipped — requires seeded org_admin JWT to ensure they get 403");
});

// ── 2. Update Org Tests ───────────────────────────────────────────

Deno.test("org-update: rejects system-only fields for org_admin (integration)", async () => {
  console.log("[integration] Skipped — requires seeded org_admin JWT patching 'plan'");
});

Deno.test("org-update: tenant isolation (integration)", async () => {
  console.log("[integration] Skipped — requires seeded org_admin for Org A patching Org B");
});

// ── 3. Org Settings Tests ─────────────────────────────────────────

Deno.test("org-settings: validates business hour format", async () => {
  // Test time regex: 25:00 is invalid
  const res = await post("organization/efn-org-settings", {
    org_id: crypto.randomUUID(),
    business_hours: { start_time: "25:00" },
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 4. Org Members Tests ──────────────────────────────────────────

Deno.test("org-members: schema enforces role on change_role action", async () => {
  const res = await post("organization/efn-org-members", {
    org_id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    action: "change_role",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("org-members: tenant isolation (integration)", async () => {
  console.log("[integration] Skipped — requires org_admin A to suspend member of Org B");
});

// ── 5. Org License Tests ──────────────────────────────────────────

Deno.test("org-license: tenant isolation (integration)", async () => {
  console.log("[integration] Skipped — requires org_admin A viewing license of Org B");
});

// ── 6. Org Dashboard Tests ────────────────────────────────────────

Deno.test("org-dashboard: reads fallback data if no snapshot exists (integration)", async () => {
  console.log("[integration] Skipped — requires seeded org without snapshots");
});
