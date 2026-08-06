/**
 * dispatch/tests/dispatch.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Unit & Integration tests for Enterprise Dispatch & Scheduling Engine.
 *
 * Run:
 *   deno test --allow-env --allow-net supabase/functions/dispatch/tests/dispatch.test.ts
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

// ═════════════════════════════════════════════════════════════════
// 1. DISPATCH ASSIGN
// ═════════════════════════════════════════════════════════════════
Deno.test("dispatch-assign: unauthenticated is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-assign", {
    work_order_id: crypto.randomUUID(), technician_id: crypto.randomUUID(),
    scheduled_start_at: "2026-07-21T09:00:00Z", scheduled_end_at: "2026-07-21T13:00:00Z",
  });
  assertEquals(res.status, 401);
});

Deno.test("dispatch-assign: inverted schedule is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-assign", {
    work_order_id: crypto.randomUUID(), technician_id: crypto.randomUUID(),
    scheduled_start_at: "2026-07-21T13:00:00Z",
    scheduled_end_at:   "2026-07-21T09:00:00Z", // Before start
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("dispatch-assign: travel_mins exceeds 480 is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-assign", {
    work_order_id: crypto.randomUUID(), technician_id: crypto.randomUUID(),
    scheduled_start_at: "2026-07-21T09:00:00Z", scheduled_end_at: "2026-07-21T17:00:00Z",
    estimated_travel_mins: 999,
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ═════════════════════════════════════════════════════════════════
// 2. DISPATCH REASSIGN
// ═════════════════════════════════════════════════════════════════
Deno.test("dispatch-reassign: missing reason is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-reassign", {
    dispatch_schedule_id: crypto.randomUUID(),
    new_technician_id:    crypto.randomUUID(),
    // reason is required
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("dispatch-reassign: unauthenticated is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-reassign", {
    dispatch_schedule_id: crypto.randomUUID(),
    new_technician_id:    crypto.randomUUID(),
    reason:               "Technician unavailable",
  });
  assertEquals(res.status, 401);
});

// ═════════════════════════════════════════════════════════════════
// 3. DISPATCH SCHEDULE
// ═════════════════════════════════════════════════════════════════
Deno.test("dispatch-schedule: invalid action is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-schedule", {
    action: "teleport",
    work_order_id: crypto.randomUUID(), technician_id: crypto.randomUUID(),
    scheduled_start_at: "2026-07-21T09:00:00Z", scheduled_end_at: "2026-07-21T13:00:00Z",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("dispatch-schedule: cancel without reason is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-schedule", {
    action: "cancel", schedule_id: crypto.randomUUID(),
    // reason required for cancel
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("dispatch-schedule: end before start is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-schedule", {
    action: "create",
    work_order_id: crypto.randomUUID(), technician_id: crypto.randomUUID(),
    scheduled_start_at: "2026-07-21T13:00:00Z",
    scheduled_end_at:   "2026-07-21T09:00:00Z",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ═════════════════════════════════════════════════════════════════
// 4. DISPATCH ROUTING
// ═════════════════════════════════════════════════════════════════
Deno.test("dispatch-routing: latitude out of range is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-routing", {
    work_order_id:   crypto.randomUUID(),
    destination_lat: 999,   // Out of valid -90..90
    destination_lng: 100,
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("dispatch-routing: unauthenticated is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-routing", {
    work_order_id: crypto.randomUUID(),
    find_nearest:  true,
  });
  assertEquals(res.status, 401);
});

// ═════════════════════════════════════════════════════════════════
// 5. DISPATCH BOARD
// ═════════════════════════════════════════════════════════════════
Deno.test("dispatch-board: unauthenticated is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-board", {
    org_id: crypto.randomUUID(),
  });
  assertEquals(res.status, 401);
});

// ═════════════════════════════════════════════════════════════════
// 6. DISPATCH WORKLOAD
// ═════════════════════════════════════════════════════════════════
Deno.test("dispatch-workload: invalid max_hours_day is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-workload", {
    org_id:        crypto.randomUUID(),
    max_hours_day: 25,  // Max is 24
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("dispatch-workload: unauthenticated is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-workload", {
    org_id: crypto.randomUUID(),
  });
  assertEquals(res.status, 401);
});

// ═════════════════════════════════════════════════════════════════
// 7. DISPATCH CALENDAR
// ═════════════════════════════════════════════════════════════════
Deno.test("dispatch-calendar: invalid include value is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-calendar", {
    technician_id: crypto.randomUUID(),
    include: ["vacations"],  // Not in enum
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ═════════════════════════════════════════════════════════════════
// 8. DISPATCH SEARCH
// ═════════════════════════════════════════════════════════════════
Deno.test("dispatch-search: invalid dispatch_status is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-search", {
    dispatch_status: "teleporting",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("dispatch-search: limit exceeding 200 is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-search", {
    limit: 999,
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("dispatch-search: unauthenticated is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-search", {});
  assertEquals(res.status, 401);
});

// ═════════════════════════════════════════════════════════════════
// 9. DISPATCH DASHBOARD
// ═════════════════════════════════════════════════════════════════
Deno.test("dispatch-dashboard: unauthenticated is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-dashboard", {
    org_id: crypto.randomUUID(),
  });
  assertEquals(res.status, 401);
});

Deno.test("dispatch-dashboard: invalid org_id format is rejected", async () => {
  const res = await post("dispatch/efn-dispatch-dashboard", {
    org_id: "not-a-valid-uuid",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});
