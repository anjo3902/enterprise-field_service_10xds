/**
 * asset/efn-asset-import/types.ts
 */

export interface AssetImportInput {
  org_id: string;
  assets: {
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
  }[];
}

export interface AssetImportResult {
  org_id:        string;
  total_records: number;
  imported:      number;
  failed:        number;
  errors:        { index: number; asset_name: string; error: string }[];
}
