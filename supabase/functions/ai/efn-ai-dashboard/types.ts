/**
 * ai/efn-ai-dashboard/types.ts
 */

export interface AiDashboardResult {
  org_id: string;
  total_requests: number;
  average_confidence: number;
  automation_rate: number;
  hitl_intervention_rate: number;
  hitl_pending: number;
  recommendations_accepted: number;
}
