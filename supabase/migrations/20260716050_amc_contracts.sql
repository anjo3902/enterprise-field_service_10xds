-- =============================================================================
-- Migration: 20260716050_amc_contracts.sql
-- Phase:     2.3 — Enterprise PM, AMC, & Warranty Engine
-- Purpose:   Create the `amc_contracts` and `amc_covered_assets` tables.
--            Manages Annual Maintenance Contracts and the assets they cover.
-- =============================================================================

-- ── 1. AMC Contracts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.amc_contracts (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  contract_number          TEXT          NOT NULL UNIQUE,
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  org_id                   UUID          NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  vendor_id                UUID          NOT NULL REFERENCES public.vendors (id) ON DELETE CASCADE,

  -- ── Terms ─────────────────────────────────────────────────────────────────
  coverage_type            TEXT          NOT NULL,               -- e.g. "Comprehensive", "Non-Comprehensive", "Labor Only"
  start_date               DATE          NOT NULL,
  end_date                 DATE          NOT NULL,
  
  contract_value           NUMERIC(15,2),
  currency                 TEXT          NOT NULL DEFAULT 'USD',
  
  visit_frequency          TEXT,                                 -- e.g. "Quarterly", "Bi-Annual"
  
  -- ── Dedicated SLAs for this contract ──────────────────────────────────────
  response_sla_policy_id   UUID          REFERENCES public.sla_policies (id) ON DELETE SET NULL,
  resolution_sla_policy_id UUID          REFERENCES public.sla_policies (id) ON DELETE SET NULL,

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   public.amc_status NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT chk_amc_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_amc_contracts_org_vendor
  ON public.amc_contracts (org_id, vendor_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_amc_contracts_updated_at
  BEFORE UPDATE ON public.amc_contracts
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.amc_contracts IS 'Master records for Annual Maintenance Contracts between orgs and vendors.';

-- ── 2. AMC Covered Assets ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.amc_covered_assets (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  amc_contract_id          UUID          NOT NULL REFERENCES public.amc_contracts (id) ON DELETE CASCADE,
  asset_id                 UUID          NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,

  coverage_level           TEXT,                                 -- Specific overrides per asset
  included_services        TEXT[],                               -- Array of covered scenarios
  exclusions               TEXT[],                               -- Array of excluded scenarios

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  
  CONSTRAINT uq_amc_asset UNIQUE (amc_contract_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_amc_covered_assets_asset_id
  ON public.amc_covered_assets (asset_id);

COMMENT ON TABLE public.amc_covered_assets IS 'Junction mapping specific assets to an AMC contract with optional coverage rules.';
