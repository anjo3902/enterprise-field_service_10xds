/**
 * auth/efn-auth-jwt-hook/index.ts
 * ─────────────────────────────────────────────────────────────────
 * Supabase Auth Hook: Custom JWT Claims.
 *
 * Trigger:  Configured in Supabase Dashboard →
 *           Authentication → Hooks → Custom Access Token Hook
 * Method:   POST (called by GoTrue on every token mint/refresh)
 * Auth:     Shared secret (HOOK_SECRET env var) — NOT a user JWT
 *
 * Payload:  { user_id: string, claims: JwtClaims }
 * Response: { claims: JwtClaims }  (with enriched app_metadata)
 *
 * Security: This endpoint MUST be protected by the hook secret.
 *           Anyone who can call it can issue arbitrary JWT claims.
 */

import { parseValue }                       from "../../shared/validation/schema-validator.ts";
import { createLogger }                     from "../../shared/logging/logger.ts";
import { handleError }                      from "../../shared/errors/error-handler.ts";
import { UnauthorizedError }                from "../../shared/errors/app-error.ts";
import { extractOrGenerateCorrelationId }   from "../../shared/logging/correlation.ts";
import { buildJwtClaims }                   from "./handler.ts";
import { JwtHookPayloadSchema }             from "./schema.ts";

const FUNCTION_NAME = "efn-auth-jwt-hook";

Deno.serve(async (req: Request) => {
  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);

  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    // ── Step 1: Validate hook secret ───────────────────────────────
    // Supabase sends the shared hook secret as a Bearer token.
    const hookSecret = Deno.env.get("HOOK_SECRET") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!hookSecret || authHeader !== `Bearer ${hookSecret}`) {
      throw new UnauthorizedError("Invalid hook secret", correlationId);
    }

    // ── Step 2: Parse + validate body ──────────────────────────────
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw new UnauthorizedError("Request body must be valid JSON", correlationId);
    }

    const payload = parseValue(raw, JwtHookPayloadSchema, correlationId);

    // ── Step 3: Build enriched claims ──────────────────────────────
    const response = await buildJwtClaims(payload, correlationId);

    log.info({ correlationId, user_id: payload.user_id, duration_ms: 0 }, "Hook completed");

    return new Response(JSON.stringify(response), {
      status:  200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
