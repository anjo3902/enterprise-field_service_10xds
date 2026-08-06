/**
 * workorder/efn-wo-checklist/types.ts
 */

export type ChecklistAction = "seed" | "respond" | "complete_item";

export interface ChecklistResult {
  work_order_id: string;
  action:        ChecklistAction;
  item_id?:      string;
  completed?:    boolean;
  total_items?:  number;
  done_items?:   number;
  all_mandatory_done?: boolean;
}
