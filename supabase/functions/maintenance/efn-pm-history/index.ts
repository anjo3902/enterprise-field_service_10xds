/**
 * maintenance/efn-pm-history/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { getPmHistory }                   from "./handler.ts";
import { PmHistorySchema }                from "./schema.ts";

const FUNCTION_NAME = "efn-pm-history";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    
    // Most roles can read history
    assertRole(ctx.claims, [
      "system_admin", "org_admin", "org_manager", "maintenance_manager", "vendor_admin", "vendor_supervisor", "dispatcher", "technician", "read_only"
    ], correlationId);
    
    const body = await parseBody(req, PmHistorySchema, correlationId);

    const result = await getPmHistory(body, ctx.claims, correlationId);
    return respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
