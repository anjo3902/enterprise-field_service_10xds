-- =============================================================================
-- Migration: 20260716083_hitl_queue.sql
-- Phase:     2.7 — Enterprise AI Intelligence Layer
-- Purpose:   Create the `hitl_queue` (Human-In-The-Loop) table.
--            Queues AI results with low confidence for mandatory human review.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.hitl_queue (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkages ──────────────────────────────────────────────────────────────
  ticket_id                UUID          REFERENCES public.tickets (id) ON DELETE CASCADE,
  ai_request_id            UUID          NOT NULL
                             REFERENCES public.ai_requests (id)
                             ON DELETE CASCADE,

  -- ── Review Trigger ────────────────────────────────────────────────────────
  -- e.g. "low_confidence", "high_cost_action", "safety_critical"
  review_type              TEXT          NOT NULL,
  confidence_score         NUMERIC(4,3)
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  reason                   TEXT          NOT NULL,

  -- ── Assignment ────────────────────────────────────────────────────────────
  assigned_reviewer_id     UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,

  -- ── Decision ──────────────────────────────────────────────────────────────
  -- e.g. "pending", "accepted", "rejected", "modified"
  decision                 TEXT,
  remarks                  TEXT,
  reviewed_at              TIMESTAMPTZ,

  -- ── Status ────────────────────────────────────────────────────────────────
  -- e.g. "pending", "in_review", "resolved"
  status                   TEXT          NOT NULL DEFAULT 'pending',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hitl_queue_status
  ON public.hitl_queue (status, created_at)
  WHERE status = 'pending';

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_hitl_queue_updated_at
  BEFORE UPDATE ON public.hitl_queue
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.hitl_queue IS 'Human-In-The-Loop queue for AI results requiring mandatory human review before action.';
