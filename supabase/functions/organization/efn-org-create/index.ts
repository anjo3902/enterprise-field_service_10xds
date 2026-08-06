/**
 * organization/efn-org-create/index.ts
 * ─────────────────────────────────────────────────────────────────
 * HTTP Edge Function — POST /organization/create
 *
 * Trigger:  HTTP POST
 * Roles:    system_admin only
 * Auth:     User JWT required
 */

import { verifyRequest }                    from "../../shared/auth/verify-jwt.ts";
import { assertRole }                       from "../../shared/auth/assert-role.ts";
import { parseBody }                        from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse }   from "../../shared/response/response-helpers.ts";
import { handleError }                      from "../../shared/errors/error-handler.ts";
import { createLogger }                     from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId }   from "../../shared/logging/correlation.ts";
import { createOrganization }               from "./handler.ts";
import { CreateOrgSchema }                  from "./schema.ts";

const FUNCTION_NAME = "efn-org-create";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, ["system_admin"], correlationId);
    const body = await parseBody(req, CreateOrgSchema, correlationId);

    const result = await createOrganization(
      body, ctx.claims, correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    log.info({ correlationId, org_id: result.org_id, duration_ms: log.elapsed() }, "Org creation complete");
    return respond.created(result, result.org_id);

  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
