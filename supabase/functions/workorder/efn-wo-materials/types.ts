/**
 * workorder/efn-wo-materials/types.ts
 */

export type MaterialAction = "reserve" | "consume" | "release";

export interface MaterialResult {
  work_order_id: string;
  action:        MaterialAction;
  part_id?:      string;
  part_name?:    string;
  quantity?:     number;
  total_cost?:   number;
}
