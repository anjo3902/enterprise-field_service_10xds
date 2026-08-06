/**
 * organization/efn-org-license/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { getOrgLicense }                  from "./handler.ts";
import { GetLicenseSchema }               from "./schema.ts";

const FUNCTION_NAME = "efn-org-license";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, ["system_admin", "org_admin"], correlationId);
    
    // For GET request, we could parse query params. For now, assuming POST/body for RPC style
    const body = await parseBody(req, GetLicenseSchema, correlationId);

    const result = await getOrgLicense(body, ctx.claims, correlationId);

    log.info({ correlationId, org_id: result.org_id, duration_ms: log.elapsed() }, "License fetch complete");
    return respond.ok(result);

  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
