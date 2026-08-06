/**
 * maintenance/efn-amc-management/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles CRUD operations for AMC contracts and linked assets.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError, ConflictError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { AmcResult } from "./types.ts";
import type { AmcManagementInput } from "./schema.ts";

const FUNCTION_NAME = "efn-amc-management";

export async function handleAmcManagement(
  body:          AmcManagementInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<AmcResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  if (body.action === "create") {
    const orgId = claims.org_id;
    if (!orgId && !claims.is_platform_admin) throw new ForbiddenError("org_id is required", correlationId);

    // Check unique contract number
    const { data: existing } = await db.from("amc_contracts").select("id").eq("contract_number", body.contract_number).maybeSingle();
    if (existing) throw new ConflictError("Contract number already exists", correlationId);

    const contractId = generateUuid();
    const { error: insErr } = await db.from("amc_contracts").insert({
      id:                       contractId,
      contract_number:          body.contract_number,
      org_id:                   orgId,
      vendor_id:                body.vendor_id,
      coverage_type:            body.coverage_type,
      start_date:               body.start_date,
      end_date:                 body.end_date,
      contract_value:           body.contract_value ?? null,
      currency:                 body.currency,
      visit_frequency:          body.visit_frequency ?? null,
      response_sla_policy_id:   body.response_sla_policy_id ?? null,
      resolution_sla_policy_id: body.resolution_sla_policy_id ?? null,
      status:                   "active",
      created_by:               claims.sub,
      created_at:               now,
    });
    if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

    if (body.assets && body.assets.length > 0) {
      const assetInserts = body.assets.map(assetId => ({
        id: generateUuid(), amc_contract_id: contractId, asset_id: assetId, created_by: claims.sub, created_at: now
      }));
      await db.from("amc_covered_assets").insert(assetInserts);
    }

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: orgId!,
      entity_type: "amc_contract", entity_id: contractId, action: "CREATE",
      new_value: { contract_number: body.contract_number, vendor: body.vendor_id },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({ event_name: "amc.created" as never, payload: { contract_id: contractId }, org_id: orgId!, correlation_id: correlationId, source_function: FUNCTION_NAME });
    log.info({ correlationId, contractId }, "AMC created");

    return { action: "create", contract_id: contractId, status: "active" };
  } else if (body.action === "update") {
    const { data: amc } = await db.from("amc_contracts").select("org_id, status").eq("id", body.contract_id).maybeSingle();
    if (!amc) throw new NotFoundError("AMC Contract", correlationId);

    if (!claims.is_platform_admin && amc["org_id"] !== claims.org_id) throw new ForbiddenError("Permission denied", correlationId);

    const patch: Record<string, unknown> = { updated_by: claims.sub, updated_at: now };
    if (body.coverage_type !== undefined) patch["coverage_type"] = body.coverage_type;
    if (body.end_date !== undefined) patch["end_date"] = body.end_date;
    if (body.contract_value !== undefined) patch["contract_value"] = body.contract_value;
    if (body.visit_frequency !== undefined) patch["visit_frequency"] = body.visit_frequency;
    if (body.response_sla_policy_id !== undefined) patch["response_sla_policy_id"] = body.response_sla_policy_id;
    if (body.resolution_sla_policy_id !== undefined) patch["resolution_sla_policy_id"] = body.resolution_sla_policy_id;
    if (body.status !== undefined) patch["status"] = body.status;

    await db.from("amc_contracts").update(patch).eq("id", body.contract_id);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: amc["org_id"] as string,
      entity_type: "amc_contract", entity_id: body.contract_id, action: "UPDATE",
      new_value: patch, ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    if (body.status === "expired") await publishEvent({ event_name: "amc.expired" as never, payload: { contract_id: body.contract_id }, org_id: amc["org_id"] as string, correlation_id: correlationId, source_function: FUNCTION_NAME });

    return { action: "update", contract_id: body.contract_id, status: body.status ?? amc["status"] as string };
  } else {
    // add_asset / remove_asset
    const { data: amc } = await db.from("amc_contracts").select("org_id").eq("id", body.contract_id).maybeSingle();
    if (!amc) throw new NotFoundError("AMC Contract", correlationId);
    if (!claims.is_platform_admin && amc["org_id"] !== claims.org_id) throw new ForbiddenError("Permission denied", correlationId);

    if (body.action === "add_asset") {
      const { data: exists } = await db.from("amc_covered_assets").select("id").eq("amc_contract_id", body.contract_id).eq("asset_id", body.asset_id).maybeSingle();
      if (!exists) {
        await db.from("amc_covered_assets").insert({
          id: generateUuid(), amc_contract_id: body.contract_id, asset_id: body.asset_id,
          coverage_level: body.coverage_level ?? null, included_services: body.included_services ?? null, exclusions: body.exclusions ?? null,
          created_by: claims.sub, created_at: now
        });
      }
      return { action: "add_asset", contract_id: body.contract_id, status: "active" };
    } else {
      await db.from("amc_covered_assets").delete().eq("amc_contract_id", body.contract_id).eq("asset_id", body.asset_id);
      return { action: "remove_asset", contract_id: body.contract_id, status: "active" };
    }
  }
}
