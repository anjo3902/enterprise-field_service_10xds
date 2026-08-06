-- =============================================================================
-- Migration: 20260716078_event_failures.sql
-- Phase:     2.6 — Enterprise Notification & Audit Foundation
-- Purpose:   Create the `event_failures` table.
--            Dead-letter queue (DLQ) for platform events that fail to process.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.event_failures (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  platform_event_id        UUID          NOT NULL
                             REFERENCES public.platform_events (id)
                             ON DELETE CASCADE,

  -- ── Failure Details ───────────────────────────────────────────────────────
  subscriber               TEXT          NOT NULL,
  failure_reason           TEXT          NOT NULL,
  
  retry_count              INT           NOT NULL DEFAULT 1,
  next_retry_at            TIMESTAMPTZ,

  -- ── Resolution ────────────────────────────────────────────────────────────
  is_resolved              BOOLEAN       NOT NULL DEFAULT false,
  resolved_at              TIMESTAMPTZ,

  -- ── Audit ─────────────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_event_failures_unresolved
  ON public.event_failures (next_retry_at)
  WHERE is_resolved = false;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_event_failures_updated_at
  BEFORE UPDATE ON public.event_failures
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.event_failures IS 'Dead-letter queue (DLQ) for failed platform event deliveries.';
