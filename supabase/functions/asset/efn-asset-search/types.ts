/**
 * asset/efn-asset-search/types.ts
 */

export interface AssetSearchQuery {
  org_id?:       string;
  search_term?:  string; // FTS query against search_vector
  category?:     string;
  status?:       string;
  vendor_id?:    string;
  site_id?:      string;
  limit?:        number;
  offset?:       number;
}

export interface AssetSearchResultItem {
  id:           string; // PK
  asset_id:     string; // Tag
  asset_name:   string;
  category:     string;
  location:     string | null;
  status:       string;
  health:       string;
  health_score: number;
}

export interface AssetSearchResult {
  data:       AssetSearchResultItem[];
  total:      number;
  limit:      number;
  offset:     number;
}
