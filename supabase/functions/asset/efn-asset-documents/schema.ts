/**
 * asset/efn-asset-documents/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

export const UploadDocumentSchema = z.object({
  action:      z.literal("upload_url"),
  asset_id_pk: uuidSchema,
  file_name:   nonEmptyString.max(200),
  file_type:   nonEmptyString.max(100).default("application/pdf"),
});

export const RemoveDocumentSchema = z.object({
  action:       z.literal("remove"),
  asset_id_pk:  uuidSchema,
  document_url: nonEmptyString.max(500),
});

export const DocumentActionSchema = z.discriminatedUnion("action", [
  UploadDocumentSchema,
  RemoveDocumentSchema,
]);

export type DocumentActionInput = z.infer<typeof DocumentActionSchema>;
