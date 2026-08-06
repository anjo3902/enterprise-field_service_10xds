/**
 * asset/efn-asset-history/types.ts
 */

export interface GetAssetHistoryQuery {
  asset_id_pk: string;
  limit?:      number;
}

export interface AssetHistoryItem {
  history_id:      string;
  activity_date:   string;
  notes:           string | null;
  status:          string | null;
  vendor_id:       string | null;
  performed_by_id: string | null;
}

export interface GetAssetHistoryResult {
  asset_id_pk: string;
  history:     AssetHistoryItem[];
}
