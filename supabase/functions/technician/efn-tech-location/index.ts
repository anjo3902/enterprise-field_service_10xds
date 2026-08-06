/**
 * technician/efn-tech-location/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { updateLocation }                 from "./handler.ts";
import { UpdateLocationSchema }           from "./schema.ts";

const FUNCTION_NAME = "efn-tech-location";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  // Skipped req method log for GPS ping to reduce noise

  try {
    const ctx  = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, ["system_admin", "technician"], correlationId);
    const body = await parseBody(req, UpdateLocationSchema, correlationId);

    const result = await updateLocation(body, ctx.claims, correlationId);
    return respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
