-- =============================================================================
-- Migration: 20260716020_asset_category_sla_mapping.sql
-- Phase:     1B.2 — Enterprise SLA Policy Engine
-- Purpose:   Create the `asset_category_sla_mapping` table.
--            Binds general asset categories (like HVAC) to specific default SLAs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.asset_category_sla_mapping (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  org_id                   UUID          NOT NULL
                             REFERENCES public.organizations (id)
                             ON DELETE CASCADE,

  -- ── Criteria ──────────────────────────────────────────────────────────────
  asset_category           TEXT          NOT NULL,             -- e.g. "HVAC", "Plumbing"
  
  -- Optional override: If a specific vendor handles this category, they can have a custom default SLA
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE CASCADE,

  -- ── Default Assignments ───────────────────────────────────────────────────
  default_sla_policy_id    UUID          NOT NULL
                             REFERENCES public.sla_policies (id)
                             ON DELETE RESTRICT,
  default_priority         public.ticket_priority NOT NULL,

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  -- Ensure one active mapping per category per vendor (NULL vendor_id counts as "default")
  CONSTRAINT uq_asset_category_sla_mapping UNIQUE NULLS NOT DISTINCT (org_id, asset_category, vendor_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_asset_category_sla_org_id
  ON public.asset_category_sla_mapping (org_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_asset_category_sla_updated_at
  BEFORE UPDATE ON public.asset_category_sla_mapping
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.asset_category_sla_mapping IS 'Maps asset categories to default SLA policies and priorities.';
