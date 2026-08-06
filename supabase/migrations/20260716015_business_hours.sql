-- =============================================================================
-- Migration: 20260716015_business_hours.sql
-- Phase:     1B.2 — Enterprise SLA Policy Engine
-- Purpose:   Create the `business_hours` table.
--            Defines operational windows for organizations, used by the 
--            dispatch and SLA engines to calculate true response times.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_hours (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  org_id                   UUID          NOT NULL
                             REFERENCES public.organizations (id)
                             ON DELETE CASCADE,

  -- ── Core Details ──────────────────────────────────────────────────────────
  name                     TEXT          NOT NULL,
  working_days             TEXT[]        NOT NULL DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  start_time               TIME          NOT NULL DEFAULT '08:00:00',
  end_time                 TIME          NOT NULL DEFAULT '17:00:00',
  break_duration_minutes   INT           NOT NULL DEFAULT 60,
  timezone                 TEXT          NOT NULL DEFAULT 'UTC',

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_business_hours_time_order CHECK (end_time > start_time),
  CONSTRAINT chk_business_hours_break_duration CHECK (break_duration_minutes >= 0)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_business_hours_org_id
  ON public.business_hours (org_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_business_hours_updated_at
  BEFORE UPDATE ON public.business_hours
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.business_hours IS 'Enterprise SLA Business Hours. Used to compute business-hour SLA deadlines.';
