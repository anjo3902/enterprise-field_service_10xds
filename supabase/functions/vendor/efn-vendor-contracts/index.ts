/**
 * vendor/efn-vendor-contracts/index.ts
 *
 * POST /vendor/contracts
 * Roles: system_admin (create), system_admin | vendor_admin (renew, terminate)
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { handleContract }                 from "./handler.ts";
import { ContractActionSchema }           from "./schema.ts";

const FUNCTION_NAME = "efn-vendor-contracts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    // Broad role check — fine-grained action guard is inside handler
    assertRole(ctx.claims, ["system_admin", "vendor_admin"], correlationId);
    const body = await parseBody(req, ContractActionSchema, correlationId);

    const result = await handleContract(
      body, ctx.claims, correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    log.info({ correlationId, contract_id: result.contract_id, duration_ms: log.elapsed() }, "Contract action complete");
    return body.action === "create" ? respond.created(result, result.contract_id) : respond.ok(result);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
