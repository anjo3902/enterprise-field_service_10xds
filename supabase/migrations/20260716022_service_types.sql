-- =============================================================================
-- Migration: 20260716022_service_types.sql
-- Phase:     1B.3 — Enterprise Service Catalog
-- Purpose:   Create the `service_types` table.
--            Specific tasks that can be requested (e.g. Installation, Repair).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.service_types (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Categorization ────────────────────────────────────────────────────────
  category_id              UUID          NOT NULL
                             REFERENCES public.service_categories (id)
                             ON DELETE CASCADE,

  -- ── Core Details ──────────────────────────────────────────────────────────
  service_code             TEXT          NOT NULL UNIQUE,
  name                     TEXT          NOT NULL,
  description              TEXT,
  estimated_duration_mins  INT,
  default_priority         public.ticket_priority,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_service_duration CHECK (estimated_duration_mins > 0)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_types_category_id
  ON public.service_types (category_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_service_types_updated_at
  BEFORE UPDATE ON public.service_types
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.service_types IS 'Specific operational services/tasks that vendors and technicians perform.';
