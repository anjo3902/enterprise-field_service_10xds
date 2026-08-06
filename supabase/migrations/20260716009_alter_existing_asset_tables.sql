-- =============================================================================
-- Migration: 20260716009_alter_existing_asset_tables.sql
-- Phase:     1A — Enterprise Database Foundation
-- Purpose:   Extend the EXISTING asset tables created by Developer 2.
--
-- ANALYSIS OF EXISTING TABLES (from machineHealth.service.ts introspection):
--
--   `assets` table existing columns (inferred from service queries):
--     - id (PK, likely UUID or bigint)
--     - asset_name       TEXT
--     - asset_id         TEXT    (display tag like "AST-10024")
--     - category         TEXT
--     - vendor           TEXT    (free text, not FK yet)
--     - location         TEXT
--     - installation_date DATE
--     - warranty_expiry   DATE
--     - health_score     NUMERIC
--     - status           TEXT    (likely "Active" | "Maintenance")
--     - amc_expiry       DATE
--     - purchase_date    DATE
--     - last_service_date DATE
--
--   `healthscores` table (from query: joins assets via asset_id):
--     - References assets(asset_id) — likely FK on the text display column
--
--   `asset_history` table:
--     - activity_date column (TIMESTAMPTZ or DATE)
--
-- REQUIRED CHANGES:
--   1. Add `org_id` FK → organizations (multi-tenancy — REQUIRED for RLS Phase 2)
--   2. Add `vendor_id` FK → vendors (replaces free-text `vendor` column)
--   3. Add `site_id` FK → sites (enterprise location hierarchy — Phase 2 table)
--   4. Add enterprise audit fields (created_by, updated_by, deleted_at)
--   5. Add `updated_at` if missing
--   6. Rename `asset_name` column alias to avoid confusion (DO NOT RENAME — add generated)
--   7. Add `search_vector` tsvector for FTS
--   8. Add `created_by` / `updated_by` audit trail
--
-- IMPORTANT SAFETY RULES APPLIED:
--   - All new columns added with DEFAULT values — safe on large tables
--   - org_id / vendor_id initially NULLABLE to allow existing rows to coexist
--   - Existing data must be backfilled in a separate data migration (not here)
--   - No column renames — preserves existing frontend queries
--   - No table drops
--   - Constraints added WITHOUT NOT NULL initially (added separately after backfill)
-- =============================================================================

-- =============================================================================
-- SECTION 1: Extend `assets`
-- =============================================================================

-- 1a. Multi-tenancy: org_id FK
--     NULL initially — existing rows don't have an org_id yet.
--     A separate backfill migration will populate this from admin configuration.
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS org_id        UUID    REFERENCES public.organizations (id) ON DELETE RESTRICT;

-- 1b. Vendor FK: structured reference to replace free-text `vendor` column.
--     The original `vendor` TEXT column is preserved for backward compatibility.
--     New FKs reference vendor rows going forward.
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS vendor_id     UUID    REFERENCES public.vendors (id) ON DELETE SET NULL;

-- 1c. Site FK: links asset to a specific building/campus.
--     Will reference sites(id) — sites table created in Phase 1B.
--     Column created here; FK constraint added in Phase 1B migration.
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS site_id       UUID;   -- FK → sites.id (Phase 1B)

-- 1d. Audit fields: enterprise requirement
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS created_by    UUID    REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS updated_by    UUID    REFERENCES public.profiles (id) ON DELETE SET NULL;

-- 1e. Soft delete — critical for multi-tenant RLS
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ DEFAULT NULL;

-- 1f. updated_at — if not already present
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ;

-- 1g. created_at — if not already present
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT now();

-- 1h. Enterprise health fields aligned to enterprise_database_design.md
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS health        public.asset_health DEFAULT 'Healthy';

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS last_inspection_at    DATE;
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS last_maintenance_at   DATE;
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS next_maintenance_at   DATE;
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS incident_count        INT NOT NULL DEFAULT 0;
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS uptime_pct            NUMERIC(5,2);
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS notes                 TEXT;
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS metadata              JSONB;
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS documents             TEXT[];

-- 1i. Full-text search vector (generated column for FTS on name + category)
--     Uses asset_name because that is the existing column name.
--     We cannot rename without breaking existing queries.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'assets'
      AND column_name  = 'search_vector'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.assets
        ADD COLUMN search_vector TSVECTOR
        GENERATED ALWAYS AS (
          to_tsvector(
            'english',
            COALESCE(asset_name, '') || ' ' ||
            COALESCE(category, '') || ' ' ||
            COALESCE(vendor, '') || ' ' ||
            COALESCE(location, '')
          )
        ) STORED
    $sql$;
  END IF;
END $$;

-- ── Indexes on assets ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assets_org_id
  ON public.assets (org_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_vendor_id
  ON public.assets (vendor_id)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_site_id
  ON public.assets (site_id)
  WHERE site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_warranty_expiry
  ON public.assets (warranty_expiry);

CREATE INDEX IF NOT EXISTS idx_assets_amc_expiry
  ON public.assets (amc_expiry);

CREATE INDEX IF NOT EXISTS idx_assets_status
  ON public.assets (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_health_score
  ON public.assets (health_score DESC)
  WHERE deleted_at IS NULL;

-- FTS index — powers AssetSearch screen
CREATE INDEX IF NOT EXISTS idx_assets_search_vector
  ON public.assets USING gin (search_vector);

-- ── updated_at trigger on assets ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_assets_updated_at ON public.assets;
CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- =============================================================================
-- SECTION 2: Extend `healthscores`
-- =============================================================================
-- healthscores is the existing equivalent of machine_health_snapshots.
-- We add enterprise fields to align it with the architecture spec.
-- The existing asset_id FK is preserved as-is.

ALTER TABLE public.healthscores
  ADD COLUMN IF NOT EXISTS org_id         UUID    REFERENCES public.organizations (id) ON DELETE SET NULL;

ALTER TABLE public.healthscores
  ADD COLUMN IF NOT EXISTS vendor_id      UUID    REFERENCES public.vendors (id) ON DELETE SET NULL;

-- AI Diagnosis fields (aligned to MachineHealthContext interface)
ALTER TABLE public.healthscores
  ADD COLUMN IF NOT EXISTS trend                  NUMERIC[];
ALTER TABLE public.healthscores
  ADD COLUMN IF NOT EXISTS detected_issues        TEXT[];
ALTER TABLE public.healthscores
  ADD COLUMN IF NOT EXISTS failure_risk           TEXT;
ALTER TABLE public.healthscores
  ADD COLUMN IF NOT EXISTS failure_risk_pct       NUMERIC(5,2);
ALTER TABLE public.healthscores
  ADD COLUMN IF NOT EXISTS recommended_actions    TEXT[];
ALTER TABLE public.healthscores
  ADD COLUMN IF NOT EXISTS spare_parts            TEXT[];
ALTER TABLE public.healthscores
  ADD COLUMN IF NOT EXISTS assigned_technician_id UUID    REFERENCES public.technicians (id) ON DELETE SET NULL;
ALTER TABLE public.healthscores
  ADD COLUMN IF NOT EXISTS model_version          TEXT;
ALTER TABLE public.healthscores
  ADD COLUMN IF NOT EXISTS created_at             TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.healthscores
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ;

-- ── Indexes on healthscores ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_healthscores_org_id
  ON public.healthscores (org_id)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_healthscores_assigned_tech
  ON public.healthscores (assigned_technician_id)
  WHERE assigned_technician_id IS NOT NULL;

-- ── updated_at trigger on healthscores ───────────────────────────────────────
DROP TRIGGER IF EXISTS trg_healthscores_updated_at ON public.healthscores;
CREATE TRIGGER trg_healthscores_updated_at
  BEFORE UPDATE ON public.healthscores
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- =============================================================================
-- SECTION 3: Extend `asset_history`
-- =============================================================================
-- asset_history is the existing equivalent of ticket_status_log / audit history.
-- We add actor tracking and org isolation.

ALTER TABLE public.asset_history
  ADD COLUMN IF NOT EXISTS org_id         UUID    REFERENCES public.organizations (id) ON DELETE SET NULL;

ALTER TABLE public.asset_history
  ADD COLUMN IF NOT EXISTS performed_by_id UUID    REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.asset_history
  ADD COLUMN IF NOT EXISTS vendor_id      UUID    REFERENCES public.vendors (id) ON DELETE SET NULL;

ALTER TABLE public.asset_history
  ADD COLUMN IF NOT EXISTS ticket_id      UUID;   -- FK → tickets.id (Phase 1B)

ALTER TABLE public.asset_history
  ADD COLUMN IF NOT EXISTS notes          TEXT;

-- ── Index on asset_history ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_asset_history_org_id
  ON public.asset_history (org_id)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_asset_history_activity_date
  ON public.asset_history (activity_date DESC);

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON COLUMN public.assets.org_id         IS 'Multi-tenancy FK. Initially NULL — backfill required after org setup. NOT NULL constraint added in Phase 2 after backfill.';
COMMENT ON COLUMN public.assets.vendor_id      IS 'Structured vendor FK. Replaces free-text vendor column going forward. Existing vendor column preserved for backward compatibility.';
COMMENT ON COLUMN public.assets.site_id        IS 'FK → sites.id. Sites table created in Phase 1B. FK constraint added in that migration.';
COMMENT ON COLUMN public.assets.search_vector  IS 'Generated tsvector for full-text search on asset name, category, vendor, and location. Powers AssetSearch screen.';
COMMENT ON COLUMN public.assets.deleted_at     IS 'Soft delete. NULL = active. RLS filters on this in Phase 2.';
COMMENT ON COLUMN public.assets.health         IS 'asset_health ENUM bucket. Set by Edge Function after health_score update.';
