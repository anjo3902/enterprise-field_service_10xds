/**
 * dispatch/efn-dispatch-assign/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { dispatchAssign }                 from "./handler.ts";
import { DispatchAssignSchema }           from "./schema.ts";

const FUNCTION_NAME = "efn-dispatch-assign";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, [
      "system_admin", "org_admin", "org_manager",
      "dispatcher", "vendor_admin", "vendor_supervisor", "support_engineer"
    ], correlationId);
    const body = await parseBody(req, DispatchAssignSchema, correlationId);

    const result = await dispatchAssign(
      body, ctx.claims, correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    return respond.created(result, result.dispatch_schedule_id);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
