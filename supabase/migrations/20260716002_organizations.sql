-- =============================================================================
-- Migration: 20260716002_organizations.sql
-- Phase:     1A — Enterprise Database Foundation
-- Purpose:   Create the `organizations` table — the top-level multi-tenant root.
--
-- Relationship summary:
--   organizations  1──* vendors        (via contracts junction)
--   organizations  1──* profiles       (users who belong to this org)
--   organizations  1──* sites          (buildings/campuses)
--   organizations  1──* assets         (equipment owned)
--   organizations  1──1 platform_licenses
--
-- Why it exists:
--   Every client company on the platform is an Organization.
--   All data (assets, tickets, PM schedules, AMC contracts) is isolated by org_id.
--   Multi-tenancy is enforced at the RLS layer using org_id from JWT claims.
--   The license columns enforce seat-based quotas without a separate join.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  -- ── Identity ──────────────────────────────────────────────────────────────
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT          NOT NULL,
  industry                 TEXT,                                -- e.g. "Healthcare", "Logistics", "Oil & Gas"
  description              TEXT,                                -- Optional marketing/onboarding description

  -- ── Subscription & Status ──────────────────────────────────────────────────
  plan                     public.subscription_tier   NOT NULL DEFAULT 'trial',
  status                   public.entity_status       NOT NULL DEFAULT 'pending_setup',

  -- ── Primary Admin Contact ──────────────────────────────────────────────────
  -- Stored here for quick access before the profile row is created during
  -- the invitation flow. These are synced to profiles after user signup.
  admin_name               TEXT,
  admin_email              TEXT          NOT NULL,
  admin_phone              TEXT,

  -- ── Geography ─────────────────────────────────────────────────────────────
  region                   TEXT,                                -- e.g. "Middle East", "South Asia"
  city                     TEXT,
  country                  TEXT,
  logo_url                 TEXT,                                -- Supabase Storage path: orgs/{org_id}/logo

  -- ── License Seats ─────────────────────────────────────────────────────────
  -- Enforce at application layer + CHECK. RLS does not enforce counts.
  license_seats_users      INT           NOT NULL DEFAULT 10,   -- Max user accounts
  license_seats_vendors    INT           NOT NULL DEFAULT 3,    -- Max active vendor contracts
  license_seats_technicians INT          NOT NULL DEFAULT 50,   -- Max technicians across all linked vendors
  subscription_renewal     DATE,                                -- When the subscription renews

  -- ── Denormalized Counters ──────────────────────────────────────────────────
  -- Updated by triggers and Edge Function side-effects. These avoid expensive
  -- COUNT(*) queries on the org dashboard.
  ticket_count             INT           NOT NULL DEFAULT 0,
  asset_count              INT           NOT NULL DEFAULT 0,
  sla_rate                 NUMERIC(5,2),                        -- Denormalized: current SLA compliance %

  -- ── Activity Tracking ─────────────────────────────────────────────────────
  last_activity_at         TIMESTAMPTZ,                         -- Last ticket raise or user login

  -- ── Suspension ────────────────────────────────────────────────────────────
  suspended_at             TIMESTAMPTZ,
  suspended_reason         TEXT,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID,                                -- FK to profiles.id — set after profile exists
  updated_by               UUID,                                -- FK to profiles.id
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,          -- Soft delete: NULL = active
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_org_seats_positive
    CHECK (
      license_seats_users >= 1
      AND license_seats_vendors >= 1
      AND license_seats_technicians >= 1
    ),
  CONSTRAINT chk_org_sla_rate
    CHECK (sla_rate IS NULL OR (sla_rate >= 0 AND sla_rate <= 100)),
  CONSTRAINT chk_org_admin_email_format
    CHECK (admin_email ~* '^[^@]+@[^@]+\.[^@]+$'),
  CONSTRAINT uq_organizations_admin_email
    UNIQUE (admin_email)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- Partial index: only live orgs. System Admin list page queries this.
CREATE INDEX IF NOT EXISTS idx_organizations_status
  ON public.organizations (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_plan
  ON public.organizations (plan);

-- Admin portal: search org by name
CREATE INDEX IF NOT EXISTS idx_organizations_name
  ON public.organizations USING gin (to_tsvector('simple', name));

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comment ───────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.organizations                    IS 'Top-level multi-tenant root. Each client company is one Organization. All platform data is isolated by org_id.';
COMMENT ON COLUMN public.organizations.plan               IS 'Billing plan: trial → professional → enterprise';
COMMENT ON COLUMN public.organizations.status             IS 'Lifecycle state. System Admin controls status transitions.';
COMMENT ON COLUMN public.organizations.license_seats_users IS 'Maximum number of active user accounts. Enforced at Edge Function layer.';
COMMENT ON COLUMN public.organizations.deleted_at         IS 'Soft delete timestamp. NULL = active. RLS filters on this.';
