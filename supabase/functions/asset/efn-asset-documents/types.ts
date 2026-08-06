/**
 * asset/efn-asset-documents/types.ts
 */

export type DocumentAction = "upload_url" | "remove";

export interface DocumentActionInput {
  action:        DocumentAction;
  asset_id_pk:   string;
  file_name?:    string; // Required for upload_url
  file_type?:    string;
  document_url?: string; // Required for remove
}

export interface DocumentResult {
  asset_id_pk:   string;
  action:        DocumentAction;
  url?:          string; // Pre-signed URL or actual DB path
}
