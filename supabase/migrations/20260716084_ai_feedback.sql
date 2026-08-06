-- =============================================================================
-- Migration: 20260716084_ai_feedback.sql
-- Phase:     2.7 — Enterprise AI Intelligence Layer
-- Purpose:   Create the `ai_feedback` table.
--            Captures human ratings and corrections on AI outputs.
--            Critical for reinforcement learning from human feedback (RLHF).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  ai_request_id            UUID          NOT NULL
                             REFERENCES public.ai_requests (id)
                             ON DELETE CASCADE,
  reviewer_id              UUID          NOT NULL
                             REFERENCES public.profiles (id)
                             ON DELETE CASCADE,

  -- ── Rating & Decision ─────────────────────────────────────────────────────
  rating                   INT           CHECK (rating >= 1 AND rating <= 5),
  is_accepted              BOOLEAN       NOT NULL DEFAULT false,
  
  -- The human's corrected version of the AI's output (if rejected)
  corrected_result         JSONB,
  comments                 TEXT,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  
  CONSTRAINT uq_ai_feedback_per_request_reviewer UNIQUE (ai_request_id, reviewer_id)
);

COMMENT ON TABLE public.ai_feedback IS 'Human ratings and corrections on AI outputs. Foundation for RLHF and model improvement.';
