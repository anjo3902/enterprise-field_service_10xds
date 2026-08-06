/**
 * reporting/efn-report-export/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Simulates queuing a background job to export reports into CSV/Excel/PDF.
 */

import { adminClient }  from "../../shared/db/client.ts";
import { createLogger } from "../../shared/logging/logger.ts";
import { publishEvent } from "../../shared/events/publisher.ts";
import { generateUuid } from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }       from "../../shared/utils/date-helpers.ts";
import { ForbiddenError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { ExportResult } from "./types.ts";
import type { ExportInput } from "./schema.ts";

const FUNCTION_NAME = "efn-report-export";

export async function handleExport(
  body:          ExportInput,
  claims:        AppClaims,
  correlationId: string,
): Promise<ExportResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  const orgId = claims.is_platform_admin ? (body.org_id ?? claims.org_id) : claims.org_id;
  if (!orgId) throw new ForbiddenError("org_id is required", correlationId);

  const jobId = generateUuid();

  // Audit export request
  await db.from("audit_logs").insert({
    id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: orgId,
    entity_type: "report_export", action: "EXPORT_REQUESTED",
    new_value: { report_type: body.report_type, export_format: body.export_format, filters: body.filters, job_id: jobId }, timestamp: now
  });

  // Publish event so a hypothetical background worker can process it
  await publishEvent({ 
    event_name: "report.exported" as never, 
    payload: { job_id: jobId, report_type: body.report_type, format: body.export_format, requester: claims.sub }, 
    org_id: orgId, correlation_id: correlationId, source_function: FUNCTION_NAME 
  });

  log.info({ correlationId, orgId, jobId, format: body.export_format }, "Report export queued");

  return {
    action: "export_report",
    report_type: body.report_type,
    export_format: body.export_format,
    status: "queued",
    job_id: jobId,
    message: `Export job ${jobId} has been queued. You will be notified when it completes.`
  };
}
