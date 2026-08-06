/**
 * asset/efn-asset-health/types.ts
 */

export interface GetAssetHealthQuery {
  asset_id_pk: string;
}

export interface GetAssetHealthResult {
  asset_id_pk:      string;
  health_score:     number;
  health_status:    string;
  failure_risk:     string | null;
  failure_risk_pct: number | null;
  detected_issues:  string[];
  recommended_actions: string[];
  trend:            number[];
  last_updated_at:  string;
}
