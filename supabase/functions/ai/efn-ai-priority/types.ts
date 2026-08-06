/**
 * ai/efn-ai-priority/types.ts
 */

export interface AiPriorityResult {
  action:               "prioritize";
  ticket_id:            string;
  ai_request_id:        string;
  recommended_priority: string;
  sla_level:            string;
  business_impact:      string;
  operational_risk:     string;
  confidence:           number;
  hitl_required:        boolean;
  status:               string;
}
