/**
 * auth/efn-auth-session/index.ts
 * ─────────────────────────────────────────────────────────────────
 * HTTP Edge Function — Session management.
 *
 * Routes:
 *   GET    /auth/session         → Current session info + permissions
 *   DELETE /auth/session         → Logout (body: { all?: boolean })
 *
 * Auth:  User JWT required for all routes.
 * Roles: All authenticated roles.
 */

import { verifyRequest }                    from "../../shared/auth/verify-jwt.ts";
import { parseBody }                        from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse }   from "../../shared/response/response-helpers.ts";
import { handleError }                      from "../../shared/errors/error-handler.ts";
import { createLogger }                     from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId }   from "../../shared/logging/correlation.ts";
import { BadRequestError }                  from "../../shared/errors/app-error.ts";
import { getSession, revokeSession }        from "./handler.ts";
import { RevokeSessionSchema }              from "./schema.ts";

const FUNCTION_NAME = "efn-auth-session";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);

  log.info({ method: req.method, url: req.url }, `${FUNCTION_NAME} invoked`);

  try {
    // ── Step 1: Verify JWT (all routes require auth) ──────────────────
    const ctx = await verifyRequest(req, correlationId);

    // ── Step 2: Route by HTTP method ──────────────────────────────────
    if (req.method === "GET") {
      const session = await getSession(ctx.claims, correlationId);
      log.info({ correlationId, duration_ms: log.elapsed() }, "Session GET complete");
      return respond.ok(session);
    }

    if (req.method === "DELETE") {
      // Body is optional; defaults to { all: false }
      let body = { all: false };
      try {
        const raw = await req.json();
        const parsed = RevokeSessionSchema.safeParse(raw);
        if (parsed.success) body = parsed.data;
      } catch { /* empty body is fine */ }

      const result = await revokeSession(
        ctx.claims,
        body.all,
        correlationId,
        req.headers.get("x-forwarded-for") ?? undefined,
        req.headers.get("user-agent") ?? undefined,
      );

      log.info({ correlationId, scope: result.scope, duration_ms: log.elapsed() }, "Session DELETE complete");
      return respond.ok(result);
    }

    throw new BadRequestError(`Method '${req.method}' not supported`, correlationId);

  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
