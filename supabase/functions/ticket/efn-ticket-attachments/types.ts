/**
 * ticket/efn-ticket-attachments/types.ts
 */

export type AttachmentAction = "upload_url" | "delete";

export interface AttachmentResult {
  ticket_id:     string;
  attachment_id?: string;
  action:        AttachmentAction;
  url?:          string;
  storage_path?: string;
}
