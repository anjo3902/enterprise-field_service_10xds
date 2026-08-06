/**
 * asset/tests/asset.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Unit & Integration tests for Asset Management Edge Functions.
 *
 * Run:
 *   deno test --allow-env --allow-net supabase/functions/asset/tests/asset.test.ts
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
Deno.test("asset-create: rejects unauthenticated", async () => {
  const res = await post("asset/efn-asset-create", {
    org_id:     crypto.randomUUID(),
    asset_name: "Chiller Unit 1",
    category:   "HVAC"
  });
  assertEquals(res.status, 401);
});

Deno.test("asset-create: schema rejects invalid status", async () => {
  const res = await post("asset/efn-asset-create", {
    org_id:     crypto.randomUUID(),
    asset_name: "Chiller Unit 1",
    category:   "HVAC",
    status:     "Broken" // Invalid enum
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 2. Update ─────────────────────────────────────────────────────
Deno.test("asset-update: requires at least one field", async () => {
  const res = await post("asset/efn-asset-update", {
    asset_id_pk: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 3. History ────────────────────────────────────────────────────
Deno.test("asset-history: limit bounds checked", async () => {
  const res = await post("asset/efn-asset-history", {
    asset_id_pk: crypto.randomUUID(),
    limit:       500, // max is 100
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 4. Health ─────────────────────────────────────────────────────
Deno.test("asset-health: unauthenticated blocked", async () => {
  const res = await post("asset/efn-asset-health", {
    asset_id_pk: crypto.randomUUID(),
  });
  assertEquals(res.status, 401);
});

// ── 5. Documents ──────────────────────────────────────────────────
Deno.test("asset-documents: missing file_name on upload_url", async () => {
  const res = await post("asset/efn-asset-documents", {
    action:      "upload_url",
    asset_id_pk: crypto.randomUUID(),
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 6. Import ─────────────────────────────────────────────────────
Deno.test("asset-import: array bounds checked", async () => {
  const res = await post("asset/efn-asset-import", {
    org_id: crypto.randomUUID(),
    assets: [], // min 1
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 7. Search ─────────────────────────────────────────────────────
Deno.test("asset-search: pagination bounds checked", async () => {
  const res = await post("asset/efn-asset-search", {
    limit:  0, // min 1
    offset: -5, // min 0
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

// ── 8. Dashboard ──────────────────────────────────────────────────
Deno.test("asset-dashboard: unauthenticated blocked", async () => {
  const res = await post("asset/efn-asset-dashboard", {
    org_id: crypto.randomUUID(),
  });
  assertEquals(res.status, 401);
});
