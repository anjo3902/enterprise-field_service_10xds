/**
 * notifications/efn-notification-inapp/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { handleInApp }                    from "./handler.ts";
import { InAppSchema }                    from "./schema.ts";

const FUNCTION_NAME = "efn-notification-inapp";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    
    // All authenticated users can access their own in-app notifications
    assertRole(ctx.claims, [
      "system_admin", "org_admin", "org_manager", "vendor_admin", "vendor_supervisor",
      "dispatcher", "technician", "maintenance_manager", "ai_reviewer", "read_only"
    ], correlationId);
    
    const body = await parseBody(req, InAppSchema, correlationId);

    const result = await handleInApp(body, ctx.claims, correlationId);
    return respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
