/**
 * notifications/efn-notification-sms/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { handleSmsDelivery }              from "./handler.ts";
import { SmsDeliverySchema }              from "./schema.ts";

const FUNCTION_NAME = "efn-notification-sms";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    
    // Typically invoked internally by pub/sub
    assertRole(ctx.claims, ["system_admin", "platform_operator"], correlationId);
    
    const body = await parseBody(req, SmsDeliverySchema, correlationId);

    const result = await handleSmsDelivery(body, ctx.claims, correlationId);
    return respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
