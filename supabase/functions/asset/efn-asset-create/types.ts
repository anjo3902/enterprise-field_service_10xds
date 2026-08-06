/**
 * asset/efn-asset-create/types.ts
 */

export interface CreateAssetInput {
  org_id:             string;
  asset_name:         string;
  category:           string;
  vendor_id?:         string;
  site_id?:           string;
  location?:          string;
  installation_date?: string;
  warranty_expiry?:   string;
  amc_expiry?:        string;
  purchase_date?:     string;
  status?:            string;
  notes?:             string;
  metadata?:          Record<string, unknown>;
}

export interface CreateAssetResult {
  asset_id_pk: string; // The UUID primary key
  asset_id:    string; // The generated display tag (AST-XXXX)
  org_id:      string;
  status:      string;
  created_at:  string;
}
