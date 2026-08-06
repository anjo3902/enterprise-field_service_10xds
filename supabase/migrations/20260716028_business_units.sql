-- =============================================================================
-- Migration: 20260716028_business_units.sql
-- Phase:     1B.4 — Enterprise Organization Structure
-- Purpose:   Create the `business_units` table.
--            Top-level organizational divisions (e.g., Technology, Finance).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_units (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  org_id                   UUID          NOT NULL
                             REFERENCES public.organizations (id)
                             ON DELETE CASCADE,

  -- ── Core Details ──────────────────────────────────────────────────────────
  business_unit_code       TEXT          NOT NULL,
  name                     TEXT          NOT NULL,
  description              TEXT,
  
  -- The manager_id will reference the `employees` table.
  -- To avoid a circular dependency during table creation, the foreign key 
  -- constraint is added in migration 031 after `employees` is created.
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
  CONSTRAINT uq_business_units_org_code UNIQUE (org_id, business_unit_code)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_business_units_org_id
  ON public.business_units (org_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_business_units_updated_at
  BEFORE UPDATE ON public.business_units
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.business_units IS 'Top-level enterprise divisions (e.g., Finance, HR, Technology).';
