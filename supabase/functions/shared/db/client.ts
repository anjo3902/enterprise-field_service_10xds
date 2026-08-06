/**
 * db/client.ts
 * ─────────────────────────────────────────────────────────────────
 * Supabase client factory functions for Edge Functions.
 *
 * Three clients:
 *   1. adminClient()      — service_role key (bypasses RLS). Use for:
 *                           system operations, cron jobs, event consumers.
 *   2. userClient(jwt)    — anon key + user JWT (respects RLS). Use for:
 *                           user-facing operations where tenant isolation is required.
 *   3. createServiceClient() — compatibility alias (replaces old _shared/supabase-client.ts)
 *
 * IMPORTANT: Never expose adminClient() to untrusted code paths.
 * It bypasses ALL RLS policies.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/config.ts";

// ── Admin Client (service_role — bypasses RLS) ────────────────────

let _adminClient: SupabaseClient | null = null;

/**
 * Returns a cached Supabase Admin client.
 * Uses service_role key. NEVER send this to the browser.
 */
export function adminClient(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      config.supabaseUrl,
      config.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession:   false,
        },
      },
    );
  }
  return _adminClient;
}

// ── User Client (honours RLS) ─────────────────────────────────────

/**
 * Creates a per-request Supabase client that forwards the caller's JWT.
 * RLS policies are enforced — this is safe for user-facing operations.
 *
 * @param authorizationHeader  The raw "Authorization: Bearer <jwt>" header value.
 */
export function userClient(authorizationHeader: string): SupabaseClient {
  return createClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      global: {
        headers: { Authorization: authorizationHeader },
      },
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
    },
  );
}

/** Compatibility alias — replaces old _shared/supabase-client.ts */
export const createServiceClient = adminClient;

// ── DB Helper — safe error unwrapper ─────────────────────────────

import { InternalError } from "../errors/app-error.ts";

/**
 * Unwraps a Supabase PostgREST result, throwing an InternalError if
 * the query failed. Returns the data on success.
 *
 * @example
 *   const ticket = await db(
 *     adminClient().from("tickets").select("*").eq("id", ticketId).single(),
 *     correlationId,
 *   );
 */
export async function db<T>(
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  correlationId?: string,
): Promise<T> {
  const { data, error } = await query;
  if (error) {
    throw new InternalError(`Database error: ${error.message}`, correlationId);
  }
  if (data === null) {
    throw new InternalError("Database returned null unexpectedly", correlationId);
  }
  return data;
}
