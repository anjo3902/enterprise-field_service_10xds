-- =============================================================================
-- Migration: 20260716003_vendors.sql
-- Phase:     1A — Enterprise Database Foundation
-- Purpose:   Create the `vendors` table — service provider entities.
--
-- Relationship summary:
--   vendors  1──* technicians    (vendor employs technicians)
--   vendors  1──* contracts      (vendor serves org under a contract)
--   vendors  1──* tickets        (ticket routed to a vendor)
--   vendors  1──* pm_schedules
--   vendors  1──* amc_contracts
--   vendors  1──* warranty_renewals
--   vendors  1──* revenue_opportunities
--
-- Why it exists:
--   A Vendor is an independent service provider entity. It does NOT belong to
--   a single organization — it can serve multiple organizations simultaneously
--   via separate contracts. This is the core of the three-tier hierarchy:
--     System Admin → Organization → Vendor → Technician
--
--   Vendors are approved by System Admin (status: pending_approval → active).
--   The trade_domains array enables OR-Tools dispatch filtering by domain.
--
-- Note on manager_id FK:
--   manager_id references profiles(id). However, profiles does not exist yet
--   (it is created in migration 20260716005). We use DEFERRABLE INITIALLY DEFERRED
--   to resolve this circular dependency safely. Supabase runs migrations in a
--   single transaction per file, so the deferred constraint resolves correctly.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vendors (
  -- ── Identity ──────────────────────────────────────────────────────────────
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT          NOT NULL,

  -- ── Service Capability ────────────────────────────────────────────────────
  -- Array of service_domain ENUMs. Used by dispatch to filter eligible vendors.
  -- GIN index enables fast "vendor covers this domain?" queries.
  trade_domains            public.service_domain[]   NOT NULL DEFAULT '{}',
  service_regions          TEXT[],                              -- ["Dubai","Abu Dhabi","Sharjah"]

  -- ── Status & Lifecycle ────────────────────────────────────────────────────
  status                   public.entity_status       NOT NULL DEFAULT 'pending_approval',

  -- ── Manager / Primary Contact ─────────────────────────────────────────────
  -- manager_id is the vendor_admin profile. Set after the invitation is accepted.
  -- DEFERRABLE because profiles table has a vendor_id FK back to this table.
  manager_id               UUID,                                -- FK → profiles.id (deferred, set post-invite)
  manager_name             TEXT,                                -- Denormalized for fast display
  manager_email            TEXT,
  manager_phone            TEXT,

  -- ── Performance Metrics ───────────────────────────────────────────────────
  -- Denormalized from analytics materialized view. Updated by pg_cron.
  rating                   NUMERIC(3,2)   CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  sla_compliance           NUMERIC(5,2)   CHECK (sla_compliance IS NULL OR (sla_compliance >= 0 AND sla_compliance <= 100)),
  sla_target               NUMERIC(5,2)   NOT NULL DEFAULT 90.0,
  technician_count         INT            NOT NULL DEFAULT 0,

  -- ── Commercial & Legal ────────────────────────────────────────────────────
  contract_id              TEXT,                                -- External ERP contract reference
  certifications           JSONB,                              -- [{name, expiry, authority, doc_url}]
  license_number           TEXT,
  license_expiry           DATE,
  logo_url                 TEXT,                                -- Supabase Storage path: vendors/{vendor_id}/logo

  -- ── Suspension ────────────────────────────────────────────────────────────
  suspended_at             TIMESTAMPTZ,
  suspended_reason         TEXT,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID,                                -- FK → profiles.id (set after profile exists)
  updated_by               UUID,
  deleted_at               TIMESTAMPTZ    DEFAULT NULL,
  created_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_vendor_sla_target
    CHECK (sla_target >= 0 AND sla_target <= 100),
  CONSTRAINT chk_vendor_tech_count_positive
    CHECK (technician_count >= 0)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vendors_status
  ON public.vendors (status)
  WHERE deleted_at IS NULL;

-- GIN index: allows fast queries like "find vendors who do HVAC or ELECTRICAL"
CREATE INDEX IF NOT EXISTS idx_vendors_trade_domains
  ON public.vendors USING gin (trade_domains);

-- Name search for admin portal
CREATE INDEX IF NOT EXISTS idx_vendors_name
  ON public.vendors USING gin (to_tsvector('simple', name));

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.vendors                  IS 'Independent service provider entities. A vendor can serve multiple organizations via contracts. Employs technicians.';
COMMENT ON COLUMN public.vendors.trade_domains    IS 'GIN-indexed array of service_domain ENUMs. Used by dispatch engine to match tickets to eligible vendors.';
COMMENT ON COLUMN public.vendors.manager_id       IS 'The vendor_admin profile. Set after invitation accepted. Deferred FK to break org→vendor→profiles circular dependency.';
COMMENT ON COLUMN public.vendors.sla_compliance   IS 'Denormalized SLA compliance %. Updated by analytics pg_cron job.';
COMMENT ON COLUMN public.vendors.certifications   IS 'JSONB array: [{name: "ISO 9001", expiry: "2027-01-01", authority: "BSI", doc_url: "..."}]';
