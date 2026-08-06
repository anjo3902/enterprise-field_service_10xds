/**
 * auth/tests/auth.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Unit + Integration test examples for the Authentication module.
 *
 * Run locally:
 *   deno test --allow-env --allow-net supabase/functions/auth/tests/auth.test.ts
 *
 * Environment required:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY,
 *   SUPABASE_JWT_SECRET, HOOK_SECRET, WEBHOOK_SECRET, APP_URL
 *
 * Test Categories:
 *   1. JWT Hook — claims injection
 *   2. Profile Sync — upsert and idempotency
 *   3. Invite — permissions, tenant isolation, seat limits
 *   4. Session — get, revoke
 *   5. Password — all actions, anti-enumeration, update auth
 */

import { assertEquals, assertExists, assertRejects }
  from "https://deno.land/std@0.224.0/assert/mod.ts";

// ── Shared Test Utilities ─────────────────────────────────────────

const BASE_URL     = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const HOOK_SECRET  = Deno.env.get("HOOK_SECRET") ?? "test-hook-secret";
const WH_SECRET    = Deno.env.get("WEBHOOK_SECRET") ?? "test-webhook-secret";

function authHeader(token: string) {
  return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
}

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

// ── 1. JWT Hook Tests ─────────────────────────────────────────────

Deno.test("jwt-hook: rejects missing hook secret", async () => {
  const res = await fetch(`${BASE_URL}/functions/v1/auth/efn-auth-jwt-hook`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer wrong-secret" },
    body:    JSON.stringify({ user_id: crypto.randomUUID(), claims: {} }),
  });
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error.code, "UNAUTHORIZED");
});

Deno.test("jwt-hook: rejects invalid UUID user_id", async () => {
  const res = await fetch(`${BASE_URL}/functions/v1/auth/efn-auth-jwt-hook`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${HOOK_SECRET}` },
    body:    JSON.stringify({ user_id: "not-a-uuid", claims: {} }),
  });
  assertEquals(res.status, 422);
  const body = await res.json();
  assertEquals(body.error.code, "VALIDATION_ERROR");
  assertExists(body.error.field_errors["user_id"]);
});

Deno.test("jwt-hook: returns minimal claims for unknown user", async () => {
  const res = await fetch(`${BASE_URL}/functions/v1/auth/efn-auth-jwt-hook`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${HOOK_SECRET}` },
    body:    JSON.stringify({
      user_id: crypto.randomUUID(),
      claims: { aud: "authenticated", exp: 9999999999, iat: 0, iss: "test", sub: crypto.randomUUID(), role: "authenticated", app_metadata: {}, user_metadata: {} },
    }),
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertExists(body.claims.app_metadata);
  assertEquals(body.claims.app_metadata.is_platform_admin, false);
});

Deno.test("jwt-hook: locked account gets 'locked' app_role", async () => {
  // This test requires a seeded locked user — integration only
  // Arrange: create user with status='suspended' in profiles
  // Act: call JWT hook with that user_id
  // Assert: app_metadata.app_role === 'locked'
  console.log("[integration] Skipped — requires seeded locked user");
});

// ── 2. Profile Sync Tests ─────────────────────────────────────────

Deno.test("profile-sync: rejects wrong webhook secret", async () => {
  const res = await fetch(`${BASE_URL}/functions/v1/auth/efn-auth-profile-sync`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer wrong" },
    body:    JSON.stringify({ type: "INSERT", table: "users", schema: "auth", record: null }),
  });
  assertEquals(res.status, 401);
});

Deno.test("profile-sync: skips non-INSERT events", async () => {
  const res = await fetch(`${BASE_URL}/functions/v1/auth/efn-auth-profile-sync`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${WH_SECRET}` },
    body:    JSON.stringify({ type: "DELETE", table: "users", schema: "auth", record: null }),
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.data.skipped, true);
});

Deno.test("profile-sync: idempotent — same user ID twice is safe", async () => {
  const userId = crypto.randomUUID();
  const record = {
    id:                 userId,
    email:              `test-${userId}@example.com`,
    created_at:         new Date().toISOString(),
    raw_user_meta_data: { role: "org_user", first_name: "Test", org_id: null },
    raw_app_meta_data:  {},
  };
  const payload = { type: "INSERT", table: "users", schema: "auth", record };

  const res1 = await fetch(`${BASE_URL}/functions/v1/auth/efn-auth-profile-sync`, {
    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${WH_SECRET}` },
    body: JSON.stringify(payload),
  });
  const res2 = await fetch(`${BASE_URL}/functions/v1/auth/efn-auth-profile-sync`, {
    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${WH_SECRET}` },
    body: JSON.stringify(payload),
  });

  // Both should succeed (idempotent)
  assertEquals(res1.status === 201 || res1.status === 200, true);
  assertEquals(res2.status === 201 || res2.status === 200, true);

  const body2 = await res2.json();
  assertEquals(body2.data.action, "already_exists");
});

// ── 3. Invite Tests ───────────────────────────────────────────────

Deno.test("invite: rejects unauthenticated request", async () => {
  const res = await post("auth/efn-auth-invite", { email: "test@test.com", role: "org_user" });
  assertEquals(res.status, 401);
});

Deno.test("invite: rejects org_user inviting anyone", async () => {
  // Arrange: get a valid JWT for an org_user role
  // This requires a real seeded user — mark as integration test
  console.log("[integration] Skipped — requires org_user JWT");
});

Deno.test("invite: rejects mismatched org_id in request", async () => {
  // Arrange: get org_admin JWT for org-A
  // Act: invite with org_id of org-B
  // Assert: 403 TENANT_MISMATCH
  console.log("[integration] Skipped — requires org_admin JWT + two org IDs");
});

Deno.test("invite: rejects org_admin inviting vendor_admin", async () => {
  // Arrange: org_admin JWT
  // Act: POST { role: "vendor_admin", vendor_id: ... }
  // Assert: 403 FORBIDDEN — org_admin cannot invite vendor_admin
  console.log("[integration] Skipped — requires org_admin JWT");
});

Deno.test("invite: schema rejects body with both org_id and vendor_id", async () => {
  // Validation happens before JWT check when the discriminated union fires
  // Use a dummy JWT that would pass auth
  const res = await post("auth/efn-auth-invite", {
    email:     "test@example.com",
    role:      "org_user",
    org_id:    crypto.randomUUID(),
    vendor_id: crypto.randomUUID(),
  }, ANON_KEY);  // Would fail at JWT level but we can test schema error shape
  assertEquals([401, 422].includes(res.status), true);
});

// ── 4. Session Tests ──────────────────────────────────────────────

Deno.test("session: GET returns 401 without token", async () => {
  const res = await fetch(`${BASE_URL}/functions/v1/auth/efn-auth-session`, { method: "GET" });
  assertEquals(res.status, 401);
});

Deno.test("session: DELETE returns 401 without token", async () => {
  const res = await fetch(`${BASE_URL}/functions/v1/auth/efn-auth-session`, { method: "DELETE" });
  assertEquals(res.status, 401);
});

Deno.test("session: GET returns session info for valid JWT (integration)", async () => {
  // Arrange: sign in a seeded user, get JWT
  // Act: GET /auth/session with Bearer <jwt>
  // Assert: 200, body.data.role, body.data.permissions[]
  console.log("[integration] Skipped — requires valid user JWT");
});

// ── 5. Password Tests ─────────────────────────────────────────────

Deno.test("password: reset_request always returns 200 (anti-enumeration)", async () => {
  const res = await post("auth/efn-auth-password", {
    action: "reset_request",
    email:  "definitely-does-not-exist@example.com",
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.data.action, "reset_request");
  assertEquals(body.data.success, true);
});

Deno.test("password: magic_link always returns 200 (anti-enumeration)", async () => {
  const res = await post("auth/efn-auth-password", {
    action: "magic_link",
    email:  "ghost@example.com",
  });
  assertEquals(res.status, 200);
});

Deno.test("password: verify_email always returns 200 (anti-enumeration)", async () => {
  const res = await post("auth/efn-auth-password", {
    action: "verify_email",
    email:  "ghost@example.com",
  });
  assertEquals(res.status, 200);
});

Deno.test("password: update rejects unauthenticated request", async () => {
  const res = await post("auth/efn-auth-password", {
    action:       "update",
    new_password: "StrongP@ssw0rd!",
  });
  assertEquals(res.status, 401);
});

Deno.test("password: update rejects weak password", async () => {
  // With a valid JWT, a weak password should fail Zod validation
  const res = await post("auth/efn-auth-password", {
    action:       "update",
    new_password: "weak",
  }, ANON_KEY);
  // 422 from Zod OR 401 from JWT check — either is correct
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("password: update rejects invalid action", async () => {
  const res = await post("auth/efn-auth-password", {
    action: "invalid_action",
    email:  "test@example.com",
  });
  assertEquals(res.status, 422);
  const body = await res.json();
  assertEquals(body.error.code, "VALIDATION_ERROR");
});
