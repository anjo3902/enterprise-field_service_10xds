/**
 * maintenance/efn-inspection/types.ts
 */

export interface InspectionResult {
  action:      "create_template" | "submit_responses";
  template_id?: string;
  work_order_id?: string;
  status:      string;
}
