-- =============================================================================
-- Migration: 20260716048_pm_plans.sql
-- Phase:     2.3 — Enterprise PM, AMC, & Warranty Engine
-- Purpose:   Create the `pm_plans` table.
--            Master template for recurring preventive maintenance on assets/locations.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pm_plans (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────────────────────
  plan_number              TEXT          NOT NULL UNIQUE,        -- e.g. PM-2026-0001

  -- ── Ownership ─────────────────────────────────────────────────────────────
  org_id                   UUID          NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  
  -- The vendor managing this PM plan (if outsourced)
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE SET NULL,

  -- ── Target Scope (Can target a specific asset OR a location) ──────────────
  asset_id                 UUID          REFERENCES public.assets (id) ON DELETE CASCADE,
  site_id                  UUID          REFERENCES public.sites (id) ON DELETE CASCADE,
  building_id              UUID          REFERENCES public.buildings (id) ON DELETE CASCADE,
  floor_id                 UUID          REFERENCES public.floors (id) ON DELETE CASCADE,
  room_id                  UUID          REFERENCES public.rooms (id) ON DELETE CASCADE,

  -- ── Service Definition ────────────────────────────────────────────────────
  service_category_id      UUID          NOT NULL REFERENCES public.service_categories (id) ON DELETE RESTRICT,
  service_type_id          UUID          REFERENCES public.service_types (id) ON DELETE RESTRICT,
  
  -- ── Scheduling Rules ──────────────────────────────────────────────────────
  frequency                public.pm_recurrence NOT NULL,
  start_date               DATE          NOT NULL,
  end_date                 DATE,
  next_due_date            DATE,
  estimated_duration_mins  INT,

  -- ── Execution Rules ───────────────────────────────────────────────────────
  checklist_template_id    UUID          REFERENCES public.checklist_templates (id) ON DELETE SET NULL,
  assigned_technician_id   UUID          REFERENCES public.technicians (id) ON DELETE SET NULL,
  priority                 public.ticket_priority NOT NULL DEFAULT 'Medium',

  -- ── Status & State ────────────────────────────────────────────────────────
  status                   public.entity_status   NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT chk_pm_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pm_plans_org_id
  ON public.pm_plans (org_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_plans_asset_id
  ON public.pm_plans (asset_id)
  WHERE asset_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_plans_next_due
  ON public.pm_plans (next_due_date)
  WHERE deleted_at IS NULL AND status = 'active';

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_pm_plans_updated_at
  BEFORE UPDATE ON public.pm_plans
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.pm_plans IS 'Master definitions for recurring preventive maintenance schedules.';
