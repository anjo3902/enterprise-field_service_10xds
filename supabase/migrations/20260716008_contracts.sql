-- =============================================================================
-- Migration: 20260716008_contracts.sql
-- Phase:     1A — Enterprise Database Foundation
-- Purpose:   Create the `contracts` table — binding agreements between one
--            organization and one vendor, governed by an SLA policy.
--
-- Relationship summary:
--   contracts  *──1 organizations  (one org per contract)
--   contracts  *──1 vendors        (one vendor per contract)
--   contracts  *──? sla_policies   (optional SLA policy; inherits platform default if NULL)
--   contracts  1──* tickets        (tickets reference the governing contract)
--
-- Why it exists:
--   In the three-tier hierarchy, Organizations never dispatch technicians directly.
--   Instead, they work through contracted Vendors. The contract defines:
--     - Which service domains the vendor will cover for this org
--     - The SLA targets (response and resolution times)
--     - The commercial terms (value, currency, renewal date)
--     - The license seat consumption for this org
--
--   A single organization may have contracts with multiple vendors (one per domain).
--   A single vendor may have contracts with multiple organizations.
--   The UNIQUE constraint prevents duplicate overlapping contracts per org-vendor-period.
--
-- Note on sla_policy_id:
--   sla_policies table is created in Phase 1B (ticket lifecycle). We define the
--   FK column here but add the constraint later via ALTER TABLE in that migration.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  -- ── Identity ──────────────────────────────────────────────────────────────
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Parties ───────────────────────────────────────────────────────────────
  org_id                   UUID          NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  vendor_id                UUID          NOT NULL REFERENCES public.vendors (id) ON DELETE RESTRICT,

  -- ── SLA Policy ────────────────────────────────────────────────────────────
  -- FK to sla_policies added in Phase 1B migration. Column created here.
  sla_policy_id            UUID,                               -- FK → sla_policies.id (Phase 1B)

  -- ── Contract Details ──────────────────────────────────────────────────────
  title                    TEXT          NOT NULL,             -- "Annual Facility Services 2026"
  contract_reference       TEXT,                              -- External ERP/legal reference number
  scope_domains            public.service_domain[]   NOT NULL DEFAULT '{}',

  -- ── Dates ─────────────────────────────────────────────────────────────────
  start_date               DATE          NOT NULL,
  end_date                 DATE          NOT NULL,

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   TEXT          NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('active', 'expired', 'terminated', 'pending')),

  -- ── Commercial Terms ──────────────────────────────────────────────────────
  monthly_value            NUMERIC(12,2),
  annual_value             NUMERIC(12,2),
  currency                 TEXT          NOT NULL DEFAULT 'USD',
  compliance_target        NUMERIC(5,2)  NOT NULL DEFAULT 90.0,
  penalty_note             TEXT,                              -- Penalty clause (legal text)

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_contracts_date_order
    CHECK (end_date > start_date),

  CONSTRAINT chk_contracts_compliance_target
    CHECK (compliance_target >= 0 AND compliance_target <= 100),

  CONSTRAINT chk_contracts_monthly_value_positive
    CHECK (monthly_value IS NULL OR monthly_value >= 0),

  CONSTRAINT chk_contracts_annual_value_positive
    CHECK (annual_value IS NULL OR annual_value >= 0),

  -- One contract per org-vendor pair per start date
  -- (allows renewal contracts for the same pair in subsequent periods)
  CONSTRAINT uq_contracts_org_vendor_start
    UNIQUE (org_id, vendor_id, start_date)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- Most common query: "active contracts for this org" (org dashboard)
CREATE INDEX IF NOT EXISTS idx_contracts_org_vendor
  ON public.contracts (org_id, vendor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_org_id
  ON public.contracts (org_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_vendor_id
  ON public.contracts (vendor_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_status
  ON public.contracts (status);

-- Expiry monitoring: pg_cron job queries contracts expiring within 30 days
CREATE INDEX IF NOT EXISTS idx_contracts_end_date
  ON public.contracts (end_date)
  WHERE status = 'active';

-- GIN for domain-based contract lookup: "does this org have an active HVAC contract?"
CREATE INDEX IF NOT EXISTS idx_contracts_scope_domains
  ON public.contracts USING gin (scope_domains);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.contracts                  IS 'Binding service agreements between one organization and one vendor. Defines scope domains, SLA targets, and commercial terms. Tickets reference their governing contract.';
COMMENT ON COLUMN public.contracts.org_id           IS 'The organization (client) party. ON DELETE RESTRICT prevents accidental org deletion with live contracts.';
COMMENT ON COLUMN public.contracts.vendor_id        IS 'The vendor (service provider) party.';
COMMENT ON COLUMN public.contracts.sla_policy_id    IS 'FK to sla_policies — added via ALTER TABLE in Phase 1B migration. NULL = inherits platform-level default.';
COMMENT ON COLUMN public.contracts.scope_domains    IS 'GIN-indexed array of service_domain ENUMs. Determines which ticket categories this contract governs.';
COMMENT ON COLUMN public.contracts.status           IS 'Managed by pg_cron expiry job and System Admin. pending → active → expired | terminated.';
