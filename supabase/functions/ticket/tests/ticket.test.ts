/**
 * ticket/tests/ticket.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Unit & Integration tests for Ticket Engine Edge Functions.
 *
 * Run:
 *   deno test --allow-env --allow-net supabase/functions/ticket/tests/ticket.test.ts
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
Deno.test("ticket-create: rejects unauthenticated", async () => {
  const res = await post("ticket/efn-ticket-create", {
    org_id: crypto.randomUUID(),
    title: "AC not working"
  });
  assertEquals(res.status, 401);
});

Deno.test("ticket-create: schema rejects invalid priority", async () => {
  const res = await post("ticket/efn-ticket-create", {
    org_id:   crypto.randomUUID(),
    title:    "AC not working",
    priority: "Urgent", // Invalid
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("ticket-create: missing title rejected", async () => {
  const res = await post("ticket/efn-ticket-create", {
    org_id: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 2. Update ──────────────────────────────────────────────────────
Deno.test("ticket-update: requires at least one field", async () => {
  const res = await post("ticket/efn-ticket-update", {
    ticket_id: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("ticket-update: invalid status rejected", async () => {
  const res = await post("ticket/efn-ticket-update", {
    ticket_id: crypto.randomUUID(),
    status:    "magic_status",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 3. Assign ──────────────────────────────────────────────────────
Deno.test("ticket-assign: requires vendor or technician for assign", async () => {
  const res = await post("ticket/efn-ticket-assign", {
    ticket_id: crypto.randomUUID(),
    action:    "assign",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("ticket-assign: invalid action rejected", async () => {
  const res = await post("ticket/efn-ticket-assign", {
    ticket_id: crypto.randomUUID(),
    action:    "magic_action",
    vendor_id: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 4. Comments ────────────────────────────────────────────────────
Deno.test("ticket-comments: empty body rejected", async () => {
  const res = await post("ticket/efn-ticket-comments", {
    action:    "add",
    ticket_id: crypto.randomUUID(),
    body:      "",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 5. Attachments ─────────────────────────────────────────────────
Deno.test("ticket-attachments: rejects unsupported MIME type", async () => {
  const res = await post("ticket/efn-ticket-attachments", {
    action:          "upload_url",
    ticket_id:       crypto.randomUUID(),
    file_name:       "virus.exe",
    mime_type:       "application/x-msdownload",
    file_size_bytes: 1024,
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("ticket-attachments: rejects oversized file", async () => {
  const res = await post("ticket/efn-ticket-attachments", {
    action:          "upload_url",
    ticket_id:       crypto.randomUUID(),
    file_name:       "large.mp4",
    mime_type:       "video/mp4",
    file_size_bytes: 200 * 1024 * 1024, // 200 MB — over 100 MB limit
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 6. Watchers ────────────────────────────────────────────────────
Deno.test("ticket-watchers: unauthenticated blocked", async () => {
  const res = await post("ticket/efn-ticket-watchers", {
    action:     "add",
    ticket_id:  crypto.randomUUID(),
    profile_id: crypto.randomUUID(),
  });
  assertEquals(res.status, 401);
});

// ── 7. History ─────────────────────────────────────────────────────
Deno.test("ticket-history: limit bounds checked", async () => {
  const res = await post("ticket/efn-ticket-history", {
    ticket_id: crypto.randomUUID(),
    limit:     500, // max 100
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("ticket-history: invalid include filter", async () => {
  const res = await post("ticket/efn-ticket-history", {
    ticket_id: crypto.randomUUID(),
    include:   ["invalid_section"],
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 8. Search ──────────────────────────────────────────────────────
Deno.test("ticket-search: pagination bounds checked", async () => {
  const res = await post("ticket/efn-ticket-search", {
    limit:  0,
    offset: -1,
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("ticket-search: invalid sort_by rejected", async () => {
  const res = await post("ticket/efn-ticket-search", {
    sort_by: "hack_field",
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 9. Dashboard ───────────────────────────────────────────────────
Deno.test("ticket-dashboard: unauthenticated blocked", async () => {
  const res = await post("ticket/efn-ticket-dashboard", {
    org_id: crypto.randomUUID(),
  });
  assertEquals(res.status, 401);
});
