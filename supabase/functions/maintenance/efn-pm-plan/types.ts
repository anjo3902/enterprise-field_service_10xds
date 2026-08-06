/**
 * maintenance/efn-pm-plan/types.ts
 */

export interface PmPlanResult {
  action:      "create" | "update" | "deactivate";
  plan_id:     string;
  plan_number: string;
  status:      string;
}
