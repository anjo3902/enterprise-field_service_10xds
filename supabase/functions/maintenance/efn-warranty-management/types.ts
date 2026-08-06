/**
 * maintenance/efn-warranty-management/types.ts
 */

export interface WarrantyResult {
  action:      "create" | "update";
  warranty_id: string;
  status:      string;
}
