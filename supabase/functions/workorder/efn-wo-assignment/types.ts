/**
 * workorder/efn-wo-assignment/types.ts
 */

export type AssignAction = "assign" | "reassign" | "unassign";

export interface WoAssignmentResult {
  work_order_id:  string;
  action:         AssignAction;
  technician_id?: string;
  vendor_id?:     string;
  assigned_at:    string;
}
