/**
 * ai/efn-ai-hitl/types.ts
 */

export interface HitlResult {
  action:   "review_decision";
  queue_id: string;
  decision: string;
  status:   string;
}
