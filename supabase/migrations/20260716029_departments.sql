-- =============================================================================
-- Migration: 20260716029_departments.sql
-- Phase:     1B.4 — Enterprise Organization Structure
-- Purpose:   Create the `departments` table.
--            Sub-divisions of Business Units.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.departments (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  business_unit_id         UUID          NOT NULL
                             REFERENCES public.business_units (id)
                             ON DELETE CASCADE,

  -- ── Core Details ──────────────────────────────────────────────────────────
  department_code          TEXT          NOT NULL,
  name                     TEXT          NOT NULL,
  email                    TEXT,
  phone                    TEXT,
  
  -- manager_id FK to employees added in migration 031
  manager_id               UUID,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT uq_departments_bu_code UNIQUE (business_unit_id, department_code)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_departments_bu_id
  ON public.departments (business_unit_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.departments IS 'Sub-divisions within a Business Unit.';
