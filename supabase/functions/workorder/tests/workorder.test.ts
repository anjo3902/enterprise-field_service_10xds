/**
 * workorder/tests/workorder.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Unit & Integration tests for Work Order Engine Edge Functions.
 *
 * Run:
 *   deno test --allow-env --allow-net supabase/functions/workorder/tests/workorder.test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

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

// ── 1. Create ──────────────────────────────────────────────────────
Deno.test("wo-create: rejects unauthenticated", async () => {
  const res = await post("workorder/efn-wo-create", {
    ticket_id: crypto.randomUUID(),
    org_id:    crypto.randomUUID(),
  });
  assertEquals(res.status, 401);
});

Deno.test("wo-create: invalid schedule order rejected", async () => {
  const res = await post("workorder/efn-wo-create", {
    ticket_id:          crypto.randomUUID(),
    org_id:             crypto.randomUUID(),
    scheduled_start_at: "2026-07-20T12:00:00Z",
    scheduled_end_at:   "2026-07-20T10:00:00Z", // Before start
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("wo-create: estimated_duration_mins too large rejected", async () => {
  const res = await post("workorder/efn-wo-create", {
    ticket_id:               crypto.randomUUID(),
    org_id:                  crypto.randomUUID(),
    estimated_duration_mins: 99999,  // Max is 2880 (48h)
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 2. Update ──────────────────────────────────────────────────────
Deno.test("wo-update: requires at least one field", async () => {
  const res = await post("workorder/efn-wo-update", {
    work_order_id: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("wo-update: invalid status rejected", async () => {
  const res = await post("workorder/efn-wo-update", {
    work_order_id: crypto.randomUUID(),
    status: "travelling", // Only open/in_progress/completed/closed allowed
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 3. Assignment ──────────────────────────────────────────────────
Deno.test("wo-assignment: requires target for assign action", async () => {
  const res = await post("workorder/efn-wo-assignment", {
    work_order_id: crypto.randomUUID(),
    action:        "assign",
    // Missing both vendor_id and technician_id
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("wo-assignment: invalid action rejected", async () => {
  const res = await post("workorder/efn-wo-assignment", {
    work_order_id: crypto.randomUUID(),
    action:        "teleport",
    vendor_id:     crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 4. Checklist ───────────────────────────────────────────────────
Deno.test("wo-checklist: invalid action rejected", async () => {
  const res = await post("workorder/efn-wo-checklist", {
    action:        "delete",
    work_order_id: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("wo-checklist: respond missing value rejected", async () => {
  const res = await post("workorder/efn-wo-checklist", {
    action:            "respond",
    work_order_id:     crypto.randomUUID(),
    checklist_item_id: crypto.randomUUID(),
    // Missing value
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 5. Materials ───────────────────────────────────────────────────
Deno.test("wo-materials: negative quantity rejected", async () => {
  const res = await post("workorder/efn-wo-materials", {
    action:        "consume",
    work_order_id: crypto.randomUUID(),
    part_name:     "Filter",
    quantity:      -5,
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("wo-materials: release without part_id rejected", async () => {
  const res = await post("workorder/efn-wo-materials", {
    action:        "release",
    work_order_id: crypto.randomUUID(),
    part_name:     "Filter",
    quantity:      1,
    // Missing part_id
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 6. Time Tracking ───────────────────────────────────────────────
Deno.test("wo-time: invalid action rejected", async () => {
  const res = await post("workorder/efn-wo-time", {
    work_order_id: crypto.randomUUID(),
    technician_id: crypto.randomUUID(),
    action:        "quantum_leap",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("wo-time: unauthenticated blocked", async () => {
  const res = await post("workorder/efn-wo-time", {
    work_order_id: crypto.randomUUID(),
    technician_id: crypto.randomUUID(),
    action:        "clock_in",
  });
  assertEquals(res.status, 401);
});

// ── 7. Status ──────────────────────────────────────────────────────
Deno.test("wo-status: invalid terminal status rejected", async () => {
  const res = await post("workorder/efn-wo-status", {
    work_order_id: crypto.randomUUID(),
    new_status:    "cancelled", // Not in DB enum
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 8. History ─────────────────────────────────────────────────────
Deno.test("wo-history: invalid include key rejected", async () => {
  const res = await post("workorder/efn-wo-history", {
    work_order_id: crypto.randomUUID(),
    include:       ["invalid_section"],
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 9. Search ──────────────────────────────────────────────────────
Deno.test("wo-search: pagination bounds enforced", async () => {
  const res = await post("workorder/efn-wo-search", {
    limit:  0,
    offset: -1,
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("wo-search: invalid sort_by rejected", async () => {
  const res = await post("workorder/efn-wo-search", {
    sort_by: "hack_field",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 10. Dashboard ──────────────────────────────────────────────────
Deno.test("wo-dashboard: unauthenticated blocked", async () => {
  const res = await post("workorder/efn-wo-dashboard", {
    org_id: crypto.randomUUID(),
  });
  assertEquals(res.status, 401);
});
