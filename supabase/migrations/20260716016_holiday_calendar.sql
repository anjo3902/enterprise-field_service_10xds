-- =============================================================================
-- Migration: 20260716016_holiday_calendar.sql
-- Phase:     1B.2 — Enterprise SLA Policy Engine
-- Purpose:   Create the `holiday_calendar` table.
--            Allows the SLA engine to pause countdowns on organizational holidays.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.holiday_calendar (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  org_id                   UUID          NOT NULL
                             REFERENCES public.organizations (id)
                             ON DELETE CASCADE,

  -- ── Core Details ──────────────────────────────────────────────────────────
  holiday_name             TEXT          NOT NULL,
  holiday_date             DATE          NOT NULL,
  region                   TEXT,                               -- Optional: if holidays differ by state/site
  is_recurring             BOOLEAN       NOT NULL DEFAULT false, -- If true, repeats on this month/day every year

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT uq_holiday_calendar_org_date_region UNIQUE (org_id, holiday_date, region)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_holiday_calendar_org_id
  ON public.holiday_calendar (org_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_holiday_calendar_date
  ON public.holiday_calendar (holiday_date);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_holiday_calendar_updated_at
  BEFORE UPDATE ON public.holiday_calendar
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.holiday_calendar IS 'Organization holidays used to pause SLA calculation clocks.';
