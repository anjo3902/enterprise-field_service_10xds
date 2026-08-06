-- =============================================================================
-- Migration: 20260716034_tickets.sql
-- Phase:     2.1 — Enterprise Ticket Engine
-- Purpose:   Create the `tickets` table.
--            The central entity of the FSM platform.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tickets (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Ticket Identity ───────────────────────────────────────────────────────
  ticket_number            TEXT          NOT NULL UNIQUE,        -- e.g. TKT-2026-00001

  -- ── Organizational Scope ──────────────────────────────────────────────────
  org_id                   UUID          NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  site_id                  UUID          REFERENCES public.sites (id) ON DELETE RESTRICT,
  building_id              UUID          REFERENCES public.buildings (id) ON DELETE RESTRICT,
  floor_id                 UUID          REFERENCES public.floors (id) ON DELETE RESTRICT,
  room_id                  UUID          REFERENCES public.rooms (id) ON DELETE RESTRICT,

  -- ── Asset ─────────────────────────────────────────────────────────────────
  asset_id                 UUID          REFERENCES public.assets (id) ON DELETE RESTRICT,

  -- ── Internal Org Structure ────────────────────────────────────────────────
  business_unit_id         UUID          REFERENCES public.business_units (id) ON DELETE SET NULL,
  department_id            UUID          REFERENCES public.departments (id) ON DELETE SET NULL,
  cost_center_id           UUID          REFERENCES public.cost_centers (id) ON DELETE SET NULL,
  requester_employee_id    UUID          REFERENCES public.employees (id) ON DELETE SET NULL,

  -- ── Service Dispatch ──────────────────────────────────────────────────────
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE SET NULL,
  assigned_technician_id   UUID          REFERENCES public.technicians (id) ON DELETE SET NULL,
  service_category_id      UUID          REFERENCES public.service_categories (id) ON DELETE SET NULL,
  service_type_id          UUID          REFERENCES public.service_types (id) ON DELETE SET NULL,

  -- ── Classification ────────────────────────────────────────────────────────
  priority                 public.ticket_priority NOT NULL DEFAULT 'Medium',
  severity                 TEXT,                                  -- e.g. "Total Failure", "Degraded", "Cosmetic"
  status                   public.ticket_status   NOT NULL DEFAULT 'open',

  -- ── Content ───────────────────────────────────────────────────────────────
  title                    TEXT          NOT NULL,
  description              TEXT,
  resolution_summary       TEXT,
  root_cause               TEXT,

  -- ── AI Diagnosis (JSONB) ──────────────────────────────────────────────────
  -- Stores AI-generated diagnosis snapshot at time of analysis.
  -- Schema: { fault_code, fault_description, recommendations, confidence_score }
  ai_diagnosis             JSONB,

  -- ── SLA Tracking ──────────────────────────────────────────────────────────
  sla_policy_id            UUID          REFERENCES public.sla_policies (id) ON DELETE SET NULL,
  response_sla_status      public.sla_status DEFAULT 'ok',
  resolution_sla_status    public.sla_status DEFAULT 'ok',
  response_due_at          TIMESTAMPTZ,
  resolution_due_at        TIMESTAMPTZ,
  responded_at             TIMESTAMPTZ,

  -- ── Key Timestamps ────────────────────────────────────────────────────────
  due_date                 TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  closed_at                TIMESTAMPTZ,

  -- ── Soft Delete ───────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Check Constraints ─────────────────────────────────────────────────────
  CONSTRAINT chk_ticket_closed_after_completed
    CHECK (closed_at IS NULL OR completed_at IS NULL OR closed_at >= completed_at)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_org_id
  ON public.tickets (org_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_vendor_id
  ON public.tickets (vendor_id, status)
  WHERE vendor_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_technician_id
  ON public.tickets (assigned_technician_id, status)
  WHERE assigned_technician_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_asset_id
  ON public.tickets (asset_id)
  WHERE asset_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_priority
  ON public.tickets (priority, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_resolution_due
  ON public.tickets (resolution_due_at)
  WHERE deleted_at IS NULL AND status NOT IN ('closed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_tickets_created_at
  ON public.tickets (created_at DESC)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.tickets             IS 'Central FSM ticket entity. Governs all service requests and work orders.';
COMMENT ON COLUMN public.tickets.ticket_number IS 'Human-readable unique ticket ID (e.g. TKT-2026-00001).';
COMMENT ON COLUMN public.tickets.ai_diagnosis  IS 'JSONB snapshot of AI fault analysis at ticket creation or re-analysis.';
