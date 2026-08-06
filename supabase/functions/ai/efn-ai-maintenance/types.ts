/**
 * ai/efn-ai-maintenance/types.ts
 */

export interface AiMaintenanceResult {
  action:                        "predict_maintenance";
  asset_id:                      string;
  ai_request_id:                 string;
  predicted_failure_date:        string;
  remaining_useful_life_days:    number;
  recommended_preventive_action: string;
  confidence:                    number;
  hitl_required:                 boolean;
  status:                        string;
}
