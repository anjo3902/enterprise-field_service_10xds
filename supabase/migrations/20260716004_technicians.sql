-- =============================================================================
-- Migration: 20260716004_technicians.sql
-- Phase:     1A — Enterprise Database Foundation
-- Purpose:   Create the `technicians` table — field workers employed by vendors.
--
-- Relationship summary:
--   technicians  *──1 vendors         (a technician belongs to exactly one vendor)
--   technicians  1──1 profiles        (the technician's auth identity)
--   technicians  1──* tickets         (tickets assigned to them)
--   technicians  1──* work_orders     (work orders they execute)
--   technicians  1──* service_reports (reports they submit)
--
-- Why it exists:
--   Separating technicians from profiles is intentional:
--   - profiles holds auth identity (email, password, JWT role)
--   - technicians holds operational state (availability, GPS, skills, domains)
--   This allows the dispatch engine and Realtime channels to query technician
--   operational data without joining auth tables.
--
--   vendor_id is NOT NULL: a technician MUST belong to a vendor.
--   user_id is the profiles.id (= auth.users.id): set during invitation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.technicians (
  -- ── Identity ──────────────────────────────────────────────────────────────
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Vendor Ownership ──────────────────────────────────────────────────────
  -- NOT NULL: technicians cannot exist without a parent vendor.
  vendor_id                UUID          NOT NULL
                             REFERENCES public.vendors (id)
                             ON DELETE RESTRICT,               -- Prevent accidental vendor deletion

  -- ── Auth Link ─────────────────────────────────────────────────────────────
  -- Set when the technician accepts their invitation and creates an account.
  -- Points to profiles.id = auth.users.id. Deferred to break circular dep.
  user_id                  UUID          UNIQUE,               -- FK → profiles.id (added post-migration 005)

  -- ── Personal Details ──────────────────────────────────────────────────────
  full_name                TEXT          NOT NULL,
  first_name               TEXT,
  last_name                TEXT,
  email                    TEXT          NOT NULL,
  phone                    TEXT,
  employee_id              TEXT,                               -- Vendor's internal employee ID
  avatar_url               TEXT,                               -- Supabase Storage path

  -- ── Skills & Domain ───────────────────────────────────────────────────────
  primary_domain           public.service_domain,             -- Primary trade (used in dispatch tier 1)
  secondary_domains        public.service_domain[],           -- Additional domains (dispatch tier 2)
  skills                   TEXT[],                            -- Specific certifications: ["AHU Maintenance","VRF Systems"]
  experience_level         public.experience_level   NOT NULL DEFAULT 'technician',
  years_experience         SMALLINT,
  certifications           JSONB,                             -- [{name, issued_by, expiry, doc_url}]

  -- ── Operational State ─────────────────────────────────────────────────────
  -- availability_state feeds the Realtime channel: technician_availability
  availability_state       public.tech_availability  NOT NULL DEFAULT 'available',
  current_ticket_id        UUID,                              -- FK → tickets.id (added in Phase 1B)
  active_job_count         SMALLINT       NOT NULL DEFAULT 0,

  -- ── GPS / Location ────────────────────────────────────────────────────────
  -- Updated by mobile app via efn-route-optimizer. Rate-limited to 30s.
  last_latitude            FLOAT,
  last_longitude           FLOAT,
  last_location_at         TIMESTAMPTZ,                       -- When GPS was last recorded

  -- ── Performance Metrics ───────────────────────────────────────────────────
  -- Denormalized from service_reports and dispatch_results analytics.
  jobs_completed           INT            NOT NULL DEFAULT 0,
  avg_resolution_hours     NUMERIC(5,2),
  customer_rating          NUMERIC(3,2)   CHECK (customer_rating IS NULL OR (customer_rating >= 0 AND customer_rating <= 5)),
  sla_compliance           NUMERIC(5,2)   CHECK (sla_compliance IS NULL OR (sla_compliance >= 0 AND sla_compliance <= 100)),
  first_time_fix_rate      NUMERIC(5,2),                      -- % tickets resolved without rework

  -- ── Working Hours ─────────────────────────────────────────────────────────
  working_hours_start      TEXT           DEFAULT '08:00',    -- "HH:MM" format (used by SLA business calendar)
  working_hours_end        TEXT           DEFAULT '18:00',
  working_days             TEXT[]         DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri'],

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID,
  updated_by               UUID,
  deleted_at               TIMESTAMPTZ    DEFAULT NULL,
  created_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_technician_active_jobs
    CHECK (active_job_count >= 0),
  CONSTRAINT chk_technician_jobs_completed
    CHECK (jobs_completed >= 0),
  CONSTRAINT uq_technician_email_vendor
    UNIQUE (email, vendor_id)                                  -- Same email cannot appear twice under the same vendor
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- Primary dispatch query: "available technicians for this vendor and domain"
CREATE INDEX IF NOT EXISTS idx_technicians_vendor_availability
  ON public.technicians (vendor_id, availability_state)
  WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_technicians_primary_domain
  ON public.technicians (primary_domain)
  WHERE deleted_at IS NULL;

-- GIN for secondary domain array — OR-Tools domain relaxation queries
CREATE INDEX IF NOT EXISTS idx_technicians_secondary_domains
  ON public.technicians USING gin (secondary_domains);

-- GPS-based distance queries (used with ST_Distance in Phase 2)
CREATE INDEX IF NOT EXISTS idx_technicians_location
  ON public.technicians (last_latitude, last_longitude)
  WHERE last_latitude IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_technicians_vendor_id
  ON public.technicians (vendor_id);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_technicians_updated_at
  BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.technicians                     IS 'Field workers employed by vendors. Holds operational state separate from auth profiles. Used by dispatch engine.';
COMMENT ON COLUMN public.technicians.vendor_id           IS 'NOT NULL. Every technician must belong to exactly one vendor.';
COMMENT ON COLUMN public.technicians.availability_state  IS 'Real-time availability. Published to Realtime channel technician_availability.';
COMMENT ON COLUMN public.technicians.primary_domain      IS 'First-tier domain for dispatch. OR-Tools uses this for tier-1 matching.';
COMMENT ON COLUMN public.technicians.secondary_domains   IS 'GIN-indexed fallback domains for tier-2 dispatch relaxation.';
COMMENT ON COLUMN public.technicians.last_latitude       IS 'Updated by mobile app GPS. Rate-limited to 30-second intervals by Edge Function.';
COMMENT ON COLUMN public.technicians.sla_compliance      IS 'Denormalized from analytics. Updated by pg_cron every 15 minutes.';
