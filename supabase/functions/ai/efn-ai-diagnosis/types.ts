/**
 * ai/efn-ai-diagnosis/types.ts
 */

export interface AiDiagnosisResult {
  action:             "diagnose";
  ticket_id:          string;
  ai_request_id:      string;
  diagnosis:          string;
  severity:           string;
  recommended_action: string;
  confidence:         number;
  hitl_required:      boolean;
  status:             string;
}
