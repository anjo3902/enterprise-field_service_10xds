-- =============================================================================
-- Migration: 20260716032_alter_assets_org.sql
-- Phase:     1B.4 — Enterprise Organization Structure
-- Purpose:   Link the `assets` table to the new Organization Hierarchy.
--            Allows for financial and departmental ownership of assets.
-- =============================================================================

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS business_unit_id      UUID REFERENCES public.business_units (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS department_id         UUID REFERENCES public.departments (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS cost_center_id        UUID REFERENCES public.cost_centers (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS owner_employee_id     UUID REFERENCES public.employees (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custodian_employee_id UUID REFERENCES public.employees (id) ON DELETE SET NULL;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assets_business_unit_id
  ON public.assets (business_unit_id)
  WHERE business_unit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_department_id
  ON public.assets (department_id)
  WHERE department_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_cost_center_id
  ON public.assets (cost_center_id)
  WHERE cost_center_id IS NOT NULL;

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.assets.business_unit_id      IS 'Enterprise Org Hierarchy: Owning Business Unit.';
COMMENT ON COLUMN public.assets.department_id         IS 'Enterprise Org Hierarchy: Owning Department.';
COMMENT ON COLUMN public.assets.cost_center_id        IS 'Enterprise Org Hierarchy: Financial Cost Center mapping.';
COMMENT ON COLUMN public.assets.owner_employee_id     IS 'Enterprise Org Hierarchy: Executive or financial owner of the asset.';
COMMENT ON COLUMN public.assets.custodian_employee_id IS 'Enterprise Org Hierarchy: The employee physically responsible for or using the asset.';
