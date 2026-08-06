-- =============================================================================
-- Migration: 20260716031_employees.sql
-- Phase:     1B.4 — Enterprise Organization Structure
-- Purpose:   Create the `employees` table and resolve circular manager FKs.
--            Master registry of enterprise staff (not necessarily app users).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.employees (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Org Hierarchy Linkages ────────────────────────────────────────────────
  org_id                   UUID          NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  business_unit_id         UUID          REFERENCES public.business_units (id) ON DELETE SET NULL,
  department_id            UUID          REFERENCES public.departments (id) ON DELETE SET NULL,
  cost_center_id           UUID          REFERENCES public.cost_centers (id) ON DELETE SET NULL,

  -- ── Core Details ──────────────────────────────────────────────────────────
  employee_code            TEXT          NOT NULL,
  name                     TEXT          NOT NULL,
  email                    TEXT,
  phone                    TEXT,
  designation              TEXT,
  
  -- Manager of this employee (self-referencing FK)
  manager_id               UUID          REFERENCES public.employees (id) ON DELETE SET NULL,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT uq_employees_org_code UNIQUE (org_id, employee_code)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_org_id
  ON public.employees (org_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.employees IS 'Enterprise employee directory. Represents personnel, not necessarily authenticated users.';

-- =============================================================================
-- RESOLVE CIRCULAR DEPENDENCIES
-- Now that `employees` exists, we can add the manager FKs to the hierarchy tables.
-- =============================================================================

DO $$
BEGIN
  -- 1. business_units.manager_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'business_units' AND constraint_name = 'fk_bu_manager'
  ) THEN
    ALTER TABLE public.business_units
      ADD CONSTRAINT fk_bu_manager FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;

  -- 2. departments.manager_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'departments' AND constraint_name = 'fk_dept_manager'
  ) THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;

  -- 3. cost_centers.manager_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'cost_centers' AND constraint_name = 'fk_cost_center_manager'
  ) THEN
    ALTER TABLE public.cost_centers
      ADD CONSTRAINT fk_cost_center_manager FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;
