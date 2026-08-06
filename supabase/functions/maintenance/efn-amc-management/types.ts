/**
 * maintenance/efn-amc-management/types.ts
 */

export interface AmcResult {
  action:      "create" | "update" | "terminate" | "add_asset" | "remove_asset";
  contract_id: string;
  status:      string;
}
