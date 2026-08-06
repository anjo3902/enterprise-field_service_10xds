/**
 * ai/efn-ai-history/types.ts
 */

export interface AiHistoryResult {
  org_id: string;
  data:   AiHistoryItem[];
  total:  number;
}

export interface AiHistoryItem {
  id:               string;
  ticket_id:        string | null;
  asset_id:         string | null;
  requested_by:     string | null;
  prompt_snippet:   string;
  latency_ms:       number | null;
  confidence_score: number | null;
  status:           string;
  started_at:       string;
  completed_at:     string | null;
}
