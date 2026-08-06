/**
 * organization/efn-org-dashboard/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { getOrgDashboard }                from "./handler.ts";
import { GetDashboardSchema }             from "./schema.ts";

const FUNCTION_NAME = "efn-org-dashboard";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, ["system_admin", "org_admin", "org_user"], correlationId); // Executive dash might be admin only, but requirements don't specify, leaving open to org_user for now.
    
    const body = await parseBody(req, GetDashboardSchema, correlationId);

    const result = await getOrgDashboard(body, ctx.claims, correlationId);

    log.info({ correlationId, org_id: result.org_id, duration_ms: log.elapsed() }, "Dashboard fetch complete");
    return respond.ok(result);

  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
