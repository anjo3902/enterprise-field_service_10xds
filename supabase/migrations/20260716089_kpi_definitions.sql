-- =============================================================================
-- Migration: 20260716089_kpi_definitions.sql
-- Phase:     2.8 — Enterprise Analytics & KPI Engine
-- Purpose:   Create the `kpi_definitions` table.
--            Master registry of all KPIs tracked in the platform.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kpi_definitions (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────────────────────
  kpi_code                 TEXT          NOT NULL UNIQUE,        -- e.g. "MTTR", "SLA_COMPLIANCE"
  name                     TEXT          NOT NULL,
  description              TEXT,

  -- ── Classification ────────────────────────────────────────────────────────
  category                 TEXT          NOT NULL,               -- e.g. "Performance", "Financial", "Operational"
  aggregation_type         TEXT          NOT NULL,               -- e.g. "SUM", "AVG", "COUNT", "PERCENTAGE"
  
  -- The formula used for computation (for reference or dynamic evaluation)
  formula                  TEXT,
  display_unit             TEXT,                                 -- e.g. "hours", "%", "USD"

  -- ── Thresholds ────────────────────────────────────────────────────────────
  target_value             NUMERIC(14,2),
  warning_threshold        NUMERIC(14,2),
  critical_threshold       NUMERIC(14,2),

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   public.entity_status NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kpi_definitions_category
  ON public.kpi_definitions (category)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_kpi_definitions_updated_at
  BEFORE UPDATE ON public.kpi_definitions
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.kpi_definitions IS 'Master registry of all KPIs tracked across the platform.';
