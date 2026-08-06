-- =============================================================================
-- Migration: 20260716030_cost_centers.sql
-- Phase:     1B.4 — Enterprise Organization Structure
-- Purpose:   Create the `cost_centers` table.
--            Financial tracking buckets tied to departments.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.cost_centers (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  department_id            UUID          NOT NULL
                             REFERENCES public.departments (id)
                             ON DELETE CASCADE,

  -- ── Core Details ──────────────────────────────────────────────────────────
  cost_center_code         TEXT          NOT NULL,
  budget                   NUMERIC(15,2) DEFAULT 0.00,
  currency                 TEXT          NOT NULL DEFAULT 'USD',
  
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
  CONSTRAINT uq_cost_centers_dept_code UNIQUE (department_id, cost_center_code)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cost_centers_dept_id
  ON public.cost_centers (department_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.cost_centers IS 'Financial tracking units for asset and maintenance budgets.';
