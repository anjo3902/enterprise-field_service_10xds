-- =============================================================================
-- Migration: 20260716053_pm_exceptions.sql
-- Phase:     2.3 — Enterprise PM, AMC, & Warranty Engine
-- Purpose:   Create the `pm_exceptions` table.
--            Tracks requests to reschedule or skip a scheduled PM event.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pm_exceptions (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  pm_schedule_id           UUID          NOT NULL
                             REFERENCES public.pm_schedules (id)
                             ON DELETE CASCADE,

  -- ── Exception Details ─────────────────────────────────────────────────────
  exception_type           TEXT          NOT NULL,               -- e.g. "reschedule_request", "skip_request"
  reason                   TEXT          NOT NULL,
  
  requested_reschedule_date DATE,

  -- ── Approval Chain ────────────────────────────────────────────────────────
  -- e.g. "pending", "approved", "rejected"
  status                   TEXT          NOT NULL DEFAULT 'pending',
  
  approved_by_id           UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  approved_at              TIMESTAMPTZ,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pm_exceptions_schedule_id
  ON public.pm_exceptions (pm_schedule_id);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_pm_exceptions_updated_at
  BEFORE UPDATE ON public.pm_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.pm_exceptions IS 'Audit trail for rescheduling or skipping scheduled PM occurrences.';
