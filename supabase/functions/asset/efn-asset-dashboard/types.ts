/**
 * asset/efn-asset-dashboard/types.ts
 */

export interface AssetDashboardQuery {
  org_id?: string;
}

export interface AssetDashboardResult {
  org_id: string;
  asset_summary: {
    total_assets:    number;
    active:          number;
    maintenance:     number;
    inactive:        number;
    decommissioned:  number;
  };
  health_overview: {
    healthy:  number;
    warning:  number;
    critical: number;
  };
  warranty_summary: {
    expired:         number;
    expiring_soon:   number;
    valid:           number;
  };
  amc_summary: {
    expired:         number;
    expiring_soon:   number;
    valid:           number;
  };
}
