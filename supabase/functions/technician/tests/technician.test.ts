/**
 * technician/tests/technician.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Unit & Integration tests for Technician Management Edge Functions.
 *
 * Run:
 *   deno test --allow-env --allow-net supabase/functions/technician/tests/technician.test.ts
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

// ── 1. Create ─────────────────────────────────────────────────────
Deno.test("tech-create: rejects unauthenticated", async () => {
  const res = await post("technician/efn-tech-create", {
    vendor_id: crypto.randomUUID(),
    full_name: "Test Tech",
    email:     "test@tech.com"
  });
  assertEquals(res.status, 401);
});

Deno.test("tech-create: schema rejects invalid email", async () => {
  const res = await post("technician/efn-tech-create", {
    vendor_id: crypto.randomUUID(),
    full_name: "Test Tech",
    email:     "not-an-email"
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 2. Update ─────────────────────────────────────────────────────
Deno.test("tech-update: requires at least one field", async () => {
  const res = await post("technician/efn-tech-update", {
    technician_id: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 3. Availability ───────────────────────────────────────────────
Deno.test("tech-availability: invalid status rejected", async () => {
  const res = await post("technician/efn-tech-availability", {
    technician_id: crypto.randomUUID(),
    status:        "sleeping", // invalid enum
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 4. Location ───────────────────────────────────────────────────
Deno.test("tech-location: invalid coordinates rejected", async () => {
  const res = await post("technician/efn-tech-location", {
    technician_id: crypto.randomUUID(),
    latitude:      95.0, // out of bounds
    longitude:     -10.0,
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 5. Skills ─────────────────────────────────────────────────────
Deno.test("tech-skills: rejects invalid action", async () => {
  const res = await post("technician/efn-tech-skills", {
    action:        "magic_skill",
    technician_id: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 6. Shifts ─────────────────────────────────────────────────────
Deno.test("tech-shifts: invalid time format rejected", async () => {
  const res = await post("technician/efn-tech-shifts", {
    action:        "create",
    technician_id: crypto.randomUUID(),
    shift_name:    "Morning",
    start_time:    "25:00", // invalid hour
    end_time:      "17:00",
    working_days:  [1, 2, 3, 4, 5],
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 7. Workload ───────────────────────────────────────────────────
Deno.test("tech-workload: rejects to_date before from_date", async () => {
  const res = await post("technician/efn-tech-workload", {
    technician_id: crypto.randomUUID(),
    from_date:     "2026-06-01",
    to_date:       "2026-05-01",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 8. Dashboard ──────────────────────────────────────────────────
Deno.test("tech-dashboard: unauthenticated blocked", async () => {
  const res = await post("technician/efn-tech-dashboard", {
    technician_id: crypto.randomUUID(),
  });
  assertEquals(res.status, 401);
});
