/**
 * auth/efn-auth-password/index.ts
 * ─────────────────────────────────────────────────────────────────
 * HTTP Edge Function — Password & email management.
 *
 * POST /auth/password
 * Body: discriminated union by `action` field:
 *   { action: "reset_request", email }          → public, no auth
 *   { action: "update", new_password }          → requires JWT
 *   { action: "verify_email", email }           → public, no auth
 *   { action: "magic_link", email }             → public, no auth
 *
 * Auth: Optional JWT. Required only for "update" action.
 */

import { verifyRequest }                    from "../../shared/auth/verify-jwt.ts";
import { parseBody }                        from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse }   from "../../shared/response/response-helpers.ts";
import { handleError }                      from "../../shared/errors/error-handler.ts";
import { createLogger }                     from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId }   from "../../shared/logging/correlation.ts";
import { ForbiddenError }                   from "../../shared/errors/app-error.ts";
import { handlePasswordAction }             from "./handler.ts";
import { PasswordActionSchema }             from "./schema.ts";

const FUNCTION_NAME = "efn-auth-password";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);

  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    // ── Step 1: Parse + validate body (before optional JWT check) ────
    const body = await parseBody(req, PasswordActionSchema, correlationId);

    // ── Step 2: JWT is required only for "update" ─────────────────────
    let claims = undefined;
    if (body.action === "update") {
      const ctx = await verifyRequest(req, correlationId);
      claims = ctx.claims;
    }

    // ── Step 3: Validate: if update but no auth header present ────────
    if (body.action === "update" && !claims) {
      throw new ForbiddenError("Password update requires authentication", correlationId);
    }

    // ── Step 4: Execute the action ────────────────────────────────────
    const result = await handlePasswordAction(
      body,
      claims,
      correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    log.info({ correlationId, action: body.action, duration_ms: log.elapsed() }, "Password action complete");
    return respond.ok(result);

  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
