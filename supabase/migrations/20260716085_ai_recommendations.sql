-- =============================================================================
-- Migration: 20260716085_ai_recommendations.sql
-- Phase:     2.7 — Enterprise AI Intelligence Layer
-- Purpose:   Create the `ai_recommendations` table.
--            Stores AI-generated recommendations for Vendor, Technician, and Dispatch.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Context ───────────────────────────────────────────────────────────────
  ticket_id                UUID          REFERENCES public.tickets (id) ON DELETE CASCADE,
  ai_request_id            UUID          REFERENCES public.ai_requests (id) ON DELETE SET NULL,

  -- ── Recommendation Subject ────────────────────────────────────────────────
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE SET NULL,
  technician_id            UUID          REFERENCES public.technicians (id) ON DELETE SET NULL,

  -- ── Recommendation Details ────────────────────────────────────────────────
  -- e.g. "vendor_assignment", "technician_assignment", "dispatch_route", "pm_schedule"
  recommendation_type      TEXT          NOT NULL,
  recommendation_score     NUMERIC(4,3)
    CHECK (recommendation_score IS NULL OR (recommendation_score >= 0 AND recommendation_score <= 1)),
  reasoning                TEXT,

  -- ── Outcome ───────────────────────────────────────────────────────────────
  is_accepted              BOOLEAN,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_ticket
  ON public.ai_recommendations (ticket_id, recommendation_type);

COMMENT ON TABLE public.ai_recommendations IS 'AI-generated vendor, technician, and dispatch recommendations per ticket.';
