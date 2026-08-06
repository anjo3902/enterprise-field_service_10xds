/**
 * asset/efn-asset-create/index.ts
 */

import { verifyRequest }                  from "../../shared/auth/verify-jwt.ts";
import { assertRole }                     from "../../shared/auth/assert-role.ts";
import { parseBody }                      from "../../shared/validation/schema-validator.ts";
import { respond, corsPreflightResponse } from "../../shared/response/response-helpers.ts";
import { handleError }                    from "../../shared/errors/error-handler.ts";
import { createLogger }                   from "../../shared/logging/logger.ts";
import { extractOrGenerateCorrelationId } from "../../shared/logging/correlation.ts";
import { createAsset }                    from "./handler.ts";
import { CreateAssetSchema }              from "./schema.ts";

const FUNCTION_NAME = "efn-asset-create";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  const correlationId = extractOrGenerateCorrelationId(req);
  const log = createLogger(FUNCTION_NAME, correlationId);
  log.info({ method: req.method }, `${FUNCTION_NAME} invoked`);

  try {
    const ctx  = await verifyRequest(req, correlationId);
    assertRole(ctx.claims, ["system_admin", "org_admin", "org_manager"], correlationId);
    const body = await parseBody(req, CreateAssetSchema, correlationId);

    const result = await createAsset(
      body, ctx.claims, correlationId,
      req.headers.get("x-forwarded-for") ?? undefined,
      req.headers.get("user-agent") ?? undefined,
    );

    log.info({ correlationId, asset_pk: result.asset_id_pk, duration_ms: log.elapsed() }, "Asset created");
    return respond.created(result, result.asset_id_pk);
  } catch (err) {
    return handleError(err, correlationId, log);
  }
});
