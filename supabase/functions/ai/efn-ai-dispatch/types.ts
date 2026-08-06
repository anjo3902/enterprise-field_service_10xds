/**
 * ai/efn-ai-dispatch/types.ts
 */

export interface AiDispatchResult {
  action:                    "dispatch_recommendation";
  ticket_id:                 string;
  ai_request_id:             string;
  recommended_vendor_id:     string | null;
  recommended_technician_id: string | null;
  recommended_schedule:      string | null;
  route_optimization_score:  number | null;
  reason:                    string;
  confidence:                number;
  hitl_required:             boolean;
  status:                    string;
}
