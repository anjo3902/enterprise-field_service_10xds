/**
 * ticket/efn-ticket-create/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { createTicket }                   from "./handler.ts";
import { CreateTicketSchema }             from "./schema.ts";

const FUNCTION_NAME = "efn-ticket-create";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    // Requesters, org users, admins, and support can create tickets
    assertRole(ctx.claims, [
      "system_admin", "org_admin", "org_manager",
      "org_user", "support_engineer", "platform_operator"
    ], correlationId);
    const body = await parseBody(req, CreateTicketSchema, correlationId);

    const result = await createTicket(
      body, ctx.claims, correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    return respond.created(result, result.ticket_id);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
