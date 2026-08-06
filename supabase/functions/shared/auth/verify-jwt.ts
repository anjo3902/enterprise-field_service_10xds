/**
 * auth/verify-jwt.ts
 * ─────────────────────────────────────────────────────────────────
 * Verifies the Authorization: Bearer <jwt> header using the Supabase
 * admin client's getUser() method (which validates the JWT against
 * the Supabase JWT secret server-side).
 *
 * Returns a fully populated RequestContext on success.
 * Throws UnauthorizedError on any failure.
 *
 * Usage:
 *   const ctx = await verifyRequest(req, correlationId);
 */

import { adminClient } from "../db/client.ts";
import { UnauthorizedError } from "../errors/app-error.ts";
import { extractOrGenerateCorrelationId } from "../logging/correlation.ts";
import { generateUuid } from "../utils/uuid-helpers.ts";
import type { AppClaims, RequestContext } from "./types.ts";

/**
 * Extracts and validates the JWT from the Authorization header.
 * Returns a RequestContext with decoded claims.
 */
export async function verifyRequest(
  req: Request,
  correlationId?: string,
): Promise<RequestContext> {
  const cid = correlationId ?? extractOrGenerateCorrelationId(req);

  // Extract Bearer token
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError(
      "Missing or malformed Authorization header",
      cid,
    );
  }

  const jwt = authHeader.replace("Bearer ", "");

  // Validate token via Supabase (checks signature + expiry)
  const { data: { user }, error } = await adminClient().auth.getUser(jwt);

  if (error || !user) {
    throw new UnauthorizedError("Invalid or expired JWT", cid);
  }

  // Extract app_metadata claims (injected by efn-auth-jwt-hook)
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;

  const claims: AppClaims = {
    sub:               user.id,
    email:             user.email ?? "",
    app_role:          (meta["app_role"] as AppClaims["app_role"]) ?? "org_user",
    org_id:            (meta["org_id"] as string | null) ?? null,
    vendor_id:         (meta["vendor_id"] as string | null) ?? null,
    tech_id:           (meta["tech_id"] as string | null) ?? null,
    tenant_type:       (meta["tenant_type"] as AppClaims["tenant_type"]) ?? "org",
    is_platform_admin: Boolean(meta["is_platform_admin"]),
    license_type:      (meta["license_type"] as AppClaims["license_type"]) ?? null,
  };

  return {
    claims,
    correlationId: cid,
    requestId:     generateUuid(),
    authHeader,
  };
}
