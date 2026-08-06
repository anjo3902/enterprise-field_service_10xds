/**
 * ai/efn-ai-inventory/types.ts
 */

export interface AiInventoryResult {
  action:              "inventory_recommendation";
  ticket_id:           string;
  ai_request_id:       string;
  required_parts:      Array<{ part_name: string; quantity: number }>;
  alternatives:        Array<{ part_name: string; quantity: number }>;
  availability_status: string;
  confidence:          number;
  hitl_required:       boolean;
  status:              string;
}
