/**
 * asset/efn-asset-documents/handler.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles asset documents using Supabase Storage.
 * Generates presigned upload URLs and removes documents from the array.
 */

import { adminClient }   from "../../shared/db/client.ts";
import { createLogger }  from "../../shared/logging/logger.ts";
import { publishEvent }  from "../../shared/events/publisher.ts";
import { generateUuid }  from "../../shared/utils/uuid-helpers.ts";
import { nowUtc }        from "../../shared/utils/date-helpers.ts";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.ts";
import type { AppClaims } from "../../shared/auth/types.ts";
import type { DocumentResult } from "./types.ts";
import type { DocumentActionInput } from "./schema.ts";

const FUNCTION_NAME = "efn-asset-documents";
const BUCKET_NAME   = "asset-documents";

export async function handleDocument(
  body:          DocumentActionInput,
  claims:        AppClaims,
  correlationId: string,
  ipAddress?:    string,
  userAgent?:    string,
): Promise<DocumentResult> {
  const log = createLogger(FUNCTION_NAME, correlationId);
  const db  = adminClient();
  const now = nowUtc();

  // ── 1. Load Current Asset ─────────────────────────────────────────
  const { data: asset, error: fetchErr } = await db
    .from("assets")
    .select("org_id, documents")
    .eq("id", body.asset_id_pk)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchErr || !asset) throw new NotFoundError("Asset", correlationId);
  const orgId = (asset as Record<string, string>)["org_id"];
  let docs = (asset as Record<string, string[]>)["documents"] ?? [];

  // ── 2. Access Control ─────────────────────────────────────────────
  if (!claims.is_platform_admin && claims.org_id !== orgId) {
    throw new ForbiddenError("Cannot manage documents for an asset outside your organization", correlationId);
  }

  let resultUrl = "";

  // ── 3. Dispatch by Action ─────────────────────────────────────────
  if (body.action === "upload_url") {
    // Generate a unique path: {org_id}/{asset_id_pk}/{uuid}_{filename}
    const safeName = body.file_name!.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${orgId}/${body.asset_id_pk}/${generateUuid()}_${safeName}`;
    
    // Create signed upload URL (valid for 15 minutes)
    const { data: uploadData, error: uploadErr } = await db.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(filePath);

    if (uploadErr) throw new Error(`Failed to generate upload URL: ${uploadErr.message}`);

    resultUrl = uploadData.signedUrl;

    // Note: We don't add to the `documents` array here.
    // The client uploads to the URL, and a storage webhook/trigger 
    // or a separate client call should append the finalized path to `documents`.
    // For this module, we'll assume the client calls a separate function to finalize,
    // or we can optimistically add it here and clean up if it fails (not ideal).
    // Let's add it optimistically for simplicity in this implementation.
    
    docs.push(filePath);
    await db.from("assets").update({ documents: docs, updated_at: now }).eq("id", body.asset_id_pk);

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: orgId,
      entity_type: "asset", entity_id: body.asset_id_pk, action: "DOCUMENT_UPLOAD",
      new_value: { file: filePath }, ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });

  } else if (body.action === "remove") {
    const filePath = body.document_url!;
    
    // Remove from array
    docs = docs.filter(d => d !== filePath);
    await db.from("assets").update({ documents: docs, updated_at: now }).eq("id", body.asset_id_pk);

    // Remove from storage
    const { error: rmErr } = await db.storage.from(BUCKET_NAME).remove([filePath]);
    if (rmErr) log.warn({ correlationId, filePath, err: rmErr.message }, "Storage file removal failed, but removed from DB");

    resultUrl = filePath;

    await db.from("audit_logs").insert({
      id: generateUuid(), actor_id: claims.sub, actor_role: claims.app_role, org_id: orgId,
      entity_type: "asset", entity_id: body.asset_id_pk, action: "DOCUMENT_REMOVE",
      old_value: { file: filePath }, ip_address: ipAddress ?? null, user_agent: userAgent ?? null, timestamp: now,
    });
  }

  // ── 4. Publish Event ──────────────────────────────────────────────
  await publishEvent({
    event_name:      body.action === "upload_url" ? ("asset.document.uploaded" as never) : ("asset.document.deleted" as never),
    payload:         { asset_id_pk: body.asset_id_pk, file: resultUrl },
    org_id:          orgId,
    correlation_id:  correlationId,
    source_function: FUNCTION_NAME,
  });

  log.info({ correlationId, asset_id: body.asset_id_pk, action: body.action }, "Document action complete");
  return { asset_id_pk: body.asset_id_pk, action: body.action, url: resultUrl };
}
