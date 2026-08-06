-- =============================================================================
-- Migration: 20260716081_ai_requests.sql
-- Phase:     2.7 — Enterprise AI Intelligence Layer
-- Purpose:   Create the `ai_requests` table.
--            Full audit trail of every AI inference call made on the platform.
--            This is the core observability log for the AI layer.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_requests (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Correlation ───────────────────────────────────────────────────────────
  -- Ties this request to a broader multi-step AI workflow
  correlation_id           UUID,

  -- ── Context (What triggered this AI call?) ────────────────────────────────
  ticket_id                UUID          REFERENCES public.tickets (id) ON DELETE SET NULL,
  asset_id                 UUID          REFERENCES public.assets (id) ON DELETE SET NULL,
  org_id                   UUID          REFERENCES public.organizations (id) ON DELETE CASCADE,
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE SET NULL,
  requested_by             UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,

  -- ── Prompt & Model Used ───────────────────────────────────────────────────
  prompt_id                UUID          REFERENCES public.ai_prompt_library (id) ON DELETE SET NULL,
  model_id                 UUID          REFERENCES public.ai_models (id) ON DELETE SET NULL,

  -- ── Payload ───────────────────────────────────────────────────────────────
  input_payload            JSONB         NOT NULL,
  output_payload           JSONB,

  -- ── Performance ───────────────────────────────────────────────────────────
  started_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  completed_at             TIMESTAMPTZ,
  latency_ms               INT,          -- computed after completion

  -- ── Token & Cost ──────────────────────────────────────────────────────────
  input_tokens             INT,
  output_tokens            INT,
  estimated_cost           NUMERIC(12,8),

  -- ── Quality ───────────────────────────────────────────────────────────────
  confidence_score         NUMERIC(4,3)
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),

  -- ── Status ────────────────────────────────────────────────────────────────
  -- e.g. "pending", "completed", "failed", "timed_out"
  status                   TEXT          NOT NULL DEFAULT 'pending'
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_requests_ticket_id
  ON public.ai_requests (ticket_id, started_at DESC)
  WHERE ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_requests_org_id
  ON public.ai_requests (org_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_requests_correlation
  ON public.ai_requests (correlation_id)
  WHERE correlation_id IS NOT NULL;

COMMENT ON TABLE public.ai_requests IS 'Full audit log of every AI inference call made on the platform. Append-only observability log.';
