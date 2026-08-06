/**
 * vendor/efn-vendor-contracts/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Contract lifecycle management: create, renew, terminate.
 *
 * Business rules:
 *   create     — system_admin only. Prevents duplicate via uq_contracts_org_vendor_start.
 *   renew      — Creates a NEW contract row (same org/vendor, new dates).
 *                The original contract remains active until expiry.
 *   terminate  — Sets status = 'terminated' + soft-records reason in penalty_note.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ConflictError, NotFoundError, ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims }         from "../../shared/auth/types.ts";
import type { ContractResult }    from "./types.ts";
import type { ContractActionInput } from "./schema.ts";

const FUNCTION_NAME = "efn-vendor-contracts";

export async function handleContract(
  body:          ContractActionInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<ContractResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── CREATE ────────────────────────────────────────────────────────
  if (body.action === "create") {
    if (!claims.is_platform_admin) {
      throw new ForbiddenError("Only system_admin can create contracts", correlationId);
    }

    const contractId = generateUuid();

    const { error: insertErr } = await db.from("contracts").insert({
      id:                  contractId,
      org_id:              body.org_id,
      vendor_id:           body.vendor_id,
      title:               body.title,
      scope_domains:       body.scope_domains,
      start_date:          body.start_date,
      end_date:            body.end_date,
      status:              "pending",
      sla_policy_id:       body.sla_policy_id  ?? null,
      contract_reference:  body.contract_reference ?? null,
      monthly_value:       body.monthly_value   ?? null,
      annual_value:        body.annual_value    ?? null,
      currency:            body.currency,
      compliance_target:   body.compliance_target,
      penalty_note:        body.penalty_note    ?? null,
      created_by:          claims.sub,
      created_at:          now,
    });

    if (insertErr) {
      if (insertErr.code === "23505") {
        throw new ConflictError(
          "A contract for this org-vendor pair with the same start_date already exists",
          correlationId,
        );
      }
      throw new Error(`Contract insert failed: ${insertErr.message}`);
    }

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role,
      org_id: body.org_id, vendor_id: body.vendor_id,
      entity_type: "contract", entity_id: contractId,
      action: "CREATE", new_value: { title: body.title, start_date: body.start_date, end_date: body.end_date },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await db.from("activity_timeline").insert({
      id: generateUuid(), entity_type: "vendor", entity_id: body.vendor_id,
      activity_type: "vendor_contract_created",
      description: `Contract '${body.title}' created with org ${body.org_id}`,
      performed_by_id: claims.sub, role: claims.app_role,
      metadata: { contract_id: contractId, org_id: body.org_id, correlation_id: correlationId },
      occurred_at: now,
    });

    await publishEvent({
      event_name: "vendor.contract.created" as never,
      payload: { contract_id: contractId, org_id: body.org_id, vendor_id: body.vendor_id },
      vendor_id: body.vendor_id, correlation_id: correlationId, source_function: FUNCTION_NAME,
    });

    log.info({ correlationId, contractId }, "Contract created");
    return { contract_id: contractId, action: "create", status: "pending" };
  }

  // ── RENEW ─────────────────────────────────────────────────────────
  if (body.action === "renew") {
    const { data: existing, error: fetchErr } = await db
      .from("contracts")
      .select("*")
      .eq("id", body.contract_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchErr || !existing) throw new NotFoundError("Contract", correlationId);

    // Vendor_admin can only renew contracts for their own vendor
    if (!claims.is_platform_admin && claims.vendor_id !== (existing as Record<string, string>)["vendor_id"]) {
      throw new ForbiddenError("Cannot renew a contract for a different vendor", correlationId);
    }

    const newContractId = generateUuid();
    const { error: renewErr } = await db.from("contracts").insert({
      ...(existing as Record<string, unknown>),
      id:         newContractId,
      start_date: body.new_start_date ?? (existing as Record<string, string>)["end_date"],
      end_date:   body.new_end_date,
      status:     "pending",
      annual_value:  body.annual_value  ?? (existing as Record<string, unknown>)["annual_value"],
      monthly_value: body.monthly_value ?? (existing as Record<string, unknown>)["monthly_value"],
      created_by: claims.sub,
      created_at: now,
      updated_at: null,
      updated_by: null,
    });

    if (renewErr) throw new Error(`Contract renewal failed: ${renewErr.message}`);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role,
      vendor_id: (existing as Record<string, string>)["vendor_id"],
      org_id:    (existing as Record<string, string>)["org_id"],
      entity_type: "contract", entity_id: newContractId,
      action: "RENEW", new_value: { original_id: body.contract_id, new_end_date: body.new_end_date },
      ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

    await publishEvent({
      event_name: "vendor.contract.updated" as never,
      payload: { original_contract_id: body.contract_id, new_contract_id: newContractId, action: "renew" },
      vendor_id: (existing as Record<string, string>)["vendor_id"],
      correlation_id: correlationId, source_function: FUNCTION_NAME,
    });

    log.info({ correlationId, newContractId, originalId: body.contract_id }, "Contract renewed");
    return { contract_id: newContractId, action: "renew", status: "pending" };
  }

  // ── TERMINATE ─────────────────────────────────────────────────────
  const { data: existing, error: fetchErr } = await db
    .from("contracts")
    .select("vendor_id, org_id, status")
    .eq("id", body.contract_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !existing) throw new NotFoundError("Contract", correlationId);

  if (!claims.is_platform_admin && claims.vendor_id !== (existing as Record<string, string>)["vendor_id"]) {
    throw new ForbiddenError("Cannot terminate a contract for a different vendor", correlationId);
  }

  if ((existing as Record<string, string>)["status"] === "terminated") {
    throw new ConflictError("Contract is already terminated", correlationId);
  }

  await db.from("contracts").update({
    status:      "terminated",
    penalty_note: body.termination_reason,
    updated_by:  claims.sub,
    updated_at:  now,
  }).eq("id", body.contract_id);

  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role,
    vendor_id: (existing as Record<string, string>)["vendor_id"],
    org_id:    (existing as Record<string, string>)["org_id"],
    entity_type: "contract", entity_id: body.contract_id,
    action: "TERMINATE",
    old_value: { status: (existing as Record<string, string>)["status"] },
    new_value: { status: "terminated", termination_reason: body.termination_reason },
    ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
  });

  await publishEvent({
    event_name: "vendor.contract.updated" as never,
    payload: { contract_id: body.contract_id, action: "terminate", reason: body.termination_reason },
    vendor_id: (existing as Record<string, string>)["vendor_id"],
    correlation_id: correlationId, source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, contract_id: body.contract_id }, "Contract terminated");
  return { contract_id: body.contract_id, action: "terminate", status: "terminated" };
}
