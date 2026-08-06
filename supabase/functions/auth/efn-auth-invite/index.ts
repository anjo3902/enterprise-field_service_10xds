/**
 * auth/efn-auth-invite/index.ts
 * ─────────────────────────────────────────────────────────────────
 * HTTP Edge Function — POST /auth/invite
 *
 * Trigger:  HTTP POST
 * Roles:    system_admin, org_admin, vendor_admin
 * Auth:     User JWT required
 *
 * Body:     { email, role, first_name?, last_name?, org_id?, vendor_id?, message? }
 * Response: { invitation_id, email, role, expires_at, status }
 */

import { verifyRequest }                    from "../../shared/auth/verify-jwt.ts";
import { assertRole }                       from "../../shared/auth/assert-role.ts";
import { parseBody }                        from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse }   from "../../shared/response/response-helpers.ts";
import { handleError }                      from "../../shared/errors/error-handler.ts";
import { createLogger }                     from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId }   from "../../shared/logging/correlation.ts";
import { inviteUser }                       from "./handler.ts";
import { InviteUserSchema }                 from "./schema.ts";

const FUNCTION_NAME   = "efn-auth-invite";
const ALLOWED_ROLES   = ["system_admin", "org_admin", "vendor_admin"] as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);

  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    // ── Step 1: Verify JWT ────────────────────────────────────────────
    const ctx = await verifyRequest(req, correlationId);

    // ── Step 2: Assert role ───────────────────────────────────────────
    assertRole(ctx.claims, [...ALLOWED_ROLES], correlationId);

    // ── Step 3: Parse + validate body ─────────────────────────────────
    const body = await parseBody(req, InviteUserSchema, correlationId);

    // ── Step 4: Execute invitation ────────────────────────────────────
    // Tenant isolation + permission matrix are inside handler
    const result = await inviteUser(
      body,
      ctx.claims,
      correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    log.info({ correlationId, invitation_id: result.invitation_id, duration_ms: log.elapsed() }, "Invite complete");
    return respond.created(result, result.invitation_id);

  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
