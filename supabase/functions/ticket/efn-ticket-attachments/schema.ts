/**
 * ticket/efn-ticket-attachments/schema.ts
 */

import { z } from "../../shared/validation/schema-validator.ts";
import { uuidSchema, nonEmptyString } from "../../shared/validation/common-validators.ts";

const ALLOWED_MIME = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime",
  "application/pdf",
  "audio/mpeg", "audio/wav",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const UploadAttachmentSchema = z.object({
  action:          z.literal("upload_url"),
  ticket_id:       uuidSchema,
  file_name:       nonEmptyString.max(200),
  mime_type:       z.enum(ALLOWED_MIME),
  file_size_bytes: z.number().int().min(1).max(100 * 1024 * 1024), // Max 100 MB
  attachment_type: z.enum(["evidence_photo", "audio_note", "video", "pdf_report", "document"]).optional(),
});

export const DeleteAttachmentSchema = z.object({
  action:        z.literal("delete"),
  ticket_id:     uuidSchema,
  attachment_id: uuidSchema,
});

export const AttachmentActionSchema = z.discriminatedUnion("action", [
  UploadAttachmentSchema,
  DeleteAttachmentSchema,
]);

export type AttachmentActionInput = z.infer<typeof AttachmentActionSchema>;
