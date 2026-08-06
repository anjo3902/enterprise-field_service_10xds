/**
 * technician/efn-tech-skills/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * CRUD for technician skills and certifications.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims }          from "../../shared/auth/types.ts";
import type { SkillResult }        from "./types.ts";
import type { TechSkillActionInput } from "./schema.ts";

const FUNCTION_NAME = "efn-tech-skills";

export async function handleTechSkill(
  body:          TechSkillActionInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<SkillResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Tenant Isolation ───────────────────────────────────────────
  const { data: tech, error: fetchErr } = await db
    .from("technicians")
    .select("vendor_id")
    .eq("id", body.technician_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !tech) throw new NotFoundError("Technician", correlationId);

  const vendorId = (tech as Record<string, string>)["vendor_id"];

  if (!claims.is_platform_admin && claims.vendor_id !== vendorId) {
    throw new ForbiddenError("Cannot manage skills for a different vendor's technician", correlationId);
  }
  // Note: Technicians can't self-certify skills in this system; typically vendor_admin/supervisor does this.
  // The index.ts RBAC restricts this to system_admin, vendor_admin, vendor_supervisor.

  let resultRecordId = "";
  let eventName      = "";
  const auditPatch: Record<string, unknown> = {};

  // ── 2. Dispatch by Action ─────────────────────────────────────────
  switch (body.action) {
    case "upsert_skill": {
      resultRecordId = generateUuid();
      const { data: upserted, error: upsertErr } = await db
        .from("technician_skills")
        .upsert({
          id:                  resultRecordId,
          technician_id:       body.technician_id,
          service_category_id: body.service_category_id,
          service_type_id:     body.service_type_id ?? null,
          skill_level:         body.skill_level ?? null,
          years_experience:    body.years_experience ?? null,
          is_primary:          body.is_primary ?? false,
          created_by:          claims.sub,
          updated_by:          claims.sub,
          created_at:          now,
          updated_at:          now,
          deleted_at:          null,
        }, {
          onConflict: "technician_id,service_category_id,service_type_id",
        })
        .select("id")
        .maybeSingle();

      if (upsertErr) throw new Error(`Skill upsert failed: ${upsertErr.message}`);
      resultRecordId = (upserted as { id: string } | null)?.id ?? resultRecordId;
      eventName = "technician.skill.updated";
      auditPatch["entity_type"] = "technician_skill";
      auditPatch["action"]      = "UPSERT";
      auditPatch["new_value"]   = { service_category_id: body.service_category_id, level: body.skill_level };
      break;
    }

    case "remove_skill": {
      resultRecordId = body.skill_id;
      const { error: rmErr } = await db
        .from("technician_skills")
        .update({ deleted_at: now, updated_by: claims.sub, updated_at: now })
        .eq("id", body.skill_id)
        .eq("technician_id", body.technician_id);

      if (rmErr) throw new Error(`Skill remove failed: ${rmErr.message}`);
      eventName = "technician.skill.updated";
      auditPatch["entity_type"] = "technician_skill";
      auditPatch["action"]      = "DELETE";
      auditPatch["old_value"]   = { skill_id: body.skill_id };
      break;
    }

    case "upsert_cert": {
      resultRecordId = generateUuid();
      const { data: upserted, error: upsertErr } = await db
        .from("technician_certifications")
        .upsert({
          id:                 resultRecordId,
          technician_id:      body.technician_id,
          certification_id:   body.certification_id,
          issue_date:         body.issue_date ?? null,
          expiry_date:        body.expiry_date ?? null,
          certificate_number: body.certificate_number ?? null,
          created_by:         claims.sub,
          updated_by:         claims.sub,
          created_at:         now,
          updated_at:         now,
          deleted_at:         null,
        }, {
          onConflict: "technician_id,certification_id",
        })
        .select("id")
        .maybeSingle();

      if (upsertErr) throw new Error(`Cert upsert failed: ${upsertErr.message}`);
      resultRecordId = (upserted as { id: string } | null)?.id ?? resultRecordId;
      eventName = "technician.certification.updated";
      auditPatch["entity_type"] = "technician_cert";
      auditPatch["action"]      = "UPSERT";
      auditPatch["new_value"]   = { certification_id: body.certification_id, expiry: body.expiry_date };
      break;
    }

    case "remove_cert": {
      resultRecordId = body.technician_cert_id;
      const { error: rmErr } = await db
        .from("technician_certifications")
        .update({ deleted_at: now, updated_by: claims.sub, updated_at: now })
        .eq("id", body.technician_cert_id)
        .eq("technician_id", body.technician_id);

      if (rmErr) throw new Error(`Cert remove failed: ${rmErr.message}`);
      eventName = "technician.certification.updated";
      auditPatch["entity_type"] = "technician_cert";
      auditPatch["action"]      = "DELETE";
      auditPatch["old_value"]   = { cert_id: body.technician_cert_id };
      break;
    }
  }

  // ── 3. Audit & Events ─────────────────────────────────────────────
  await db.from("audit_logs").insert({
    id:          generateUuid(),
    actor_id:    claims.sub,
    actor_role:  claims.app_role,
    vendor_id:   vendorId,
    entity_id:   resultRecordId,
    ip_address:  ipAddress ?? null,
    user_agent:  userAgent ?? null,
    timestamp:   now,
    ...auditPatch,
  });

  await publishEvent({
    event_name:      eventName as never,
    payload:         { technician_id: body.technician_id, record_id: resultRecordId, action: body.action },
    vendor_id:       vendorId,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, technician_id: body.technician_id, action: body.action }, "Technician skill/cert managed");
  return { technician_id: body.technician_id, action: body.action, record_id: resultRecordId };
}
