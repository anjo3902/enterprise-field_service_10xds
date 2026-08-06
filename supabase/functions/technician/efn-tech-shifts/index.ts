/**
 * technician/efn-tech-shifts/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { handleTechShift }                from "./handler.ts";
import { ShiftActionSchema }              from "./schema.ts";

const FUNCTION_NAME = "efn-tech-shifts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, ["system_admin", "vendor_admin", "vendor_supervisor", "dispatcher"], correlationId);
    const body = await parseBody(req, ShiftActionSchema, correlationId);

    const result = await handleTechShift(
      body, ctx.claims, correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    return body.action === "create" ? respond.created(result) : respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
