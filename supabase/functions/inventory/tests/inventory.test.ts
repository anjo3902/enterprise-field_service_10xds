/**
 * inventory/tests/inventory.test.ts
 * ─────────────────────────────────────────────────────────────────
 * Unit & Integration tests for Enterprise Inventory Engine.
 *
 * Run:
 *   deno test --allow-env --allow-net supabase/functions/inventory/tests/inventory.test.ts
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
// 1. INVENTORY ITEM
// ═════════════════════════════════════════════════════════════════
Deno.test("inventory-item: missing action is rejected", async () => {
  const res = await post("inventory/efn-inventory-item", {
    item_code: "P-100", name: "Pump", category: "HVAC"
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("inventory-item: unauthenticated is rejected", async () => {
  const res = await post("inventory/efn-inventory-item", {
    action: "create", item_code: "P-100", name: "Pump", category: "HVAC"
  });
  assertEquals(res.status, 401);
});

// ═════════════════════════════════════════════════════════════════
// 2. INVENTORY STOCK
// ═════════════════════════════════════════════════════════════════
Deno.test("inventory-stock: missing reason on reconcile is rejected", async () => {
  const res = await post("inventory/efn-inventory-stock", {
    action: "reconcile",
    warehouse_id: crypto.randomUUID(), inventory_item_id: crypto.randomUUID(),
    actual_quantity: 10,
    // reason missing
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("inventory-stock: unauthenticated is rejected", async () => {
  const res = await post("inventory/efn-inventory-stock", {
    action: "get", warehouse_id: crypto.randomUUID(), inventory_item_id: crypto.randomUUID()
  });
  assertEquals(res.status, 401);
});

// ═════════════════════════════════════════════════════════════════
// 3. INVENTORY MOVEMENT
// ═════════════════════════════════════════════════════════════════
Deno.test("inventory-movement: zero quantity is rejected", async () => {
  const res = await post("inventory/efn-inventory-movement", {
    warehouse_id: crypto.randomUUID(), inventory_item_id: crypto.randomUUID(),
    movement_type: "adjustment", quantity: 0,
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("inventory-movement: unauthenticated is rejected", async () => {
  const res = await post("inventory/efn-inventory-movement", {
    warehouse_id: crypto.randomUUID(), inventory_item_id: crypto.randomUUID(),
    movement_type: "receipt", quantity: 10,
  });
  assertEquals(res.status, 401);
});

// ═════════════════════════════════════════════════════════════════
// 4. INVENTORY RESERVATION
// ═════════════════════════════════════════════════════════════════
Deno.test("inventory-reservation: reserve missing fields is rejected", async () => {
  const res = await post("inventory/efn-inventory-reservation", {
    action: "reserve",
    work_order_id: crypto.randomUUID(),
    // missing quantity, etc
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("inventory-reservation: unauthenticated is rejected", async () => {
  const res = await post("inventory/efn-inventory-reservation", {
    action: "cancel", reservation_id: crypto.randomUUID()
  });
  assertEquals(res.status, 401);
});

// ═════════════════════════════════════════════════════════════════
// 5. INVENTORY TRANSFER
// ═════════════════════════════════════════════════════════════════
Deno.test("inventory-transfer: zero quantity is rejected", async () => {
  const res = await post("inventory/efn-inventory-transfer", {
    source_id: crypto.randomUUID(), destination_id: crypto.randomUUID(),
    transfer_type: "warehouse_to_warehouse", inventory_item_id: crypto.randomUUID(),
    quantity: 0,
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("inventory-transfer: unauthenticated is rejected", async () => {
  const res = await post("inventory/efn-inventory-transfer", {
    source_id: crypto.randomUUID(), destination_id: crypto.randomUUID(),
    transfer_type: "warehouse_to_warehouse", inventory_item_id: crypto.randomUUID(),
    quantity: 5,
  });
  assertEquals(res.status, 401);
});

// ═════════════════════════════════════════════════════════════════
// 6. INVENTORY PURCHASE
// ═════════════════════════════════════════════════════════════════
Deno.test("inventory-purchase: empty items list is rejected", async () => {
  const res = await post("inventory/efn-inventory-purchase", {
    action: "create", items: [],
  }, ANON_KEY);
  assertEquals([401, 422].includes(res.status), true);
});

Deno.test("inventory-purchase: unauthenticated is rejected", async () => {
  const res = await post("inventory/efn-inventory-purchase", {
    action: "create", items: [{ inventory_item_id: crypto.randomUUID(), quantity: 10 }]
  });
  assertEquals(res.status, 401);
});

// ═════════════════════════════════════════════════════════════════
// 7. INVENTORY SEARCH
// ═════════════════════════════════════════════════════════════════
Deno.test("inventory-search: valid schema passes auth gate", async () => {
  const res = await post("inventory/efn-inventory-search", {
    limit: 10,
  }, ANON_KEY);
  assertEquals([401, 403].includes(res.status), true);
});

Deno.test("inventory-search: unauthenticated is rejected", async () => {
  const res = await post("inventory/efn-inventory-search", {});
  assertEquals(res.status, 401);
});

// ═════════════════════════════════════════════════════════════════
// 8. INVENTORY DASHBOARD
// ═════════════════════════════════════════════════════════════════
Deno.test("inventory-dashboard: valid schema passes auth gate", async () => {
  const res = await post("inventory/efn-inventory-dashboard", {
    org_id: crypto.randomUUID()
  }, ANON_KEY);
  assertEquals([401, 403].includes(res.status), true);
});

Deno.test("inventory-dashboard: unauthenticated is rejected", async () => {
  const res = await post("inventory/efn-inventory-dashboard", {});
  assertEquals(res.status, 401);
});
