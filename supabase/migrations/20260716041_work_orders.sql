-- =============================================================================
-- Migration: 20260716041_work_orders.sql
-- Phase:     2.2 — Enterprise Work Order & Service Execution Engine
-- Purpose:   Create the `work_orders` table.
--            The operational execution object generated from a Ticket.
--            One Ticket may produce one or more Work Orders.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.work_orders (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────────────────────
  work_order_number        TEXT          NOT NULL UNIQUE,        -- e.g. WO-2026-00001

  -- ── Parent Ticket ─────────────────────────────────────────────────────────
  ticket_id                UUID          NOT NULL
                             REFERENCES public.tickets (id)
                             ON DELETE RESTRICT,

  -- ── Organizational Scope ──────────────────────────────────────────────────
  org_id                   UUID          NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  site_id                  UUID          REFERENCES public.sites (id) ON DELETE RESTRICT,
  building_id              UUID          REFERENCES public.buildings (id) ON DELETE RESTRICT,
  floor_id                 UUID          REFERENCES public.floors (id) ON DELETE RESTRICT,
  room_id                  UUID          REFERENCES public.rooms (id) ON DELETE RESTRICT,
  asset_id                 UUID          REFERENCES public.assets (id) ON DELETE RESTRICT,

  -- ── Dispatch ──────────────────────────────────────────────────────────────
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE SET NULL,
  technician_id            UUID          REFERENCES public.technicians (id) ON DELETE SET NULL,
  service_category_id      UUID          REFERENCES public.service_categories (id) ON DELETE SET NULL,
  service_type_id          UUID          REFERENCES public.service_types (id) ON DELETE SET NULL,

  -- ── Classification ────────────────────────────────────────────────────────
  priority                 public.ticket_priority NOT NULL DEFAULT 'Medium',
  status                   public.work_order_status NOT NULL DEFAULT 'open',

  -- ── Schedule ──────────────────────────────────────────────────────────────
  scheduled_start_at       TIMESTAMPTZ,
  scheduled_end_at         TIMESTAMPTZ,
  estimated_duration_mins  INT,

  -- ── Execution Timeline ────────────────────────────────────────────────────
  travel_started_at        TIMESTAMPTZ,
  arrived_at               TIMESTAMPTZ,
  actual_start_at          TIMESTAMPTZ,
  actual_end_at            TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  verified_at              TIMESTAMPTZ,
  org_accepted_at          TIMESTAMPTZ,

  -- Computed from actual_start_at / actual_end_at (in minutes)
  actual_duration_mins     INT,

  -- ── Resolution Details ────────────────────────────────────────────────────
  resolution_summary       TEXT,
  root_cause               TEXT,
  follow_up_required       BOOLEAN       NOT NULL DEFAULT false,
  follow_up_notes          TEXT,

  -- ── Soft Delete ───────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  -- ── Check Constraints ─────────────────────────────────────────────────────
  CONSTRAINT chk_wo_schedule_order
    CHECK (scheduled_end_at IS NULL OR scheduled_start_at IS NULL OR scheduled_end_at > scheduled_start_at),
  CONSTRAINT chk_wo_actual_order
    CHECK (actual_end_at IS NULL OR actual_start_at IS NULL OR actual_end_at >= actual_start_at)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_work_orders_ticket_id
  ON public.work_orders (ticket_id);

CREATE INDEX IF NOT EXISTS idx_work_orders_org_status
  ON public.work_orders (org_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_vendor_status
  ON public.work_orders (vendor_id, status)
  WHERE vendor_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_technician_status
  ON public.work_orders (technician_id, status)
  WHERE technician_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_start
  ON public.work_orders (scheduled_start_at)
  WHERE deleted_at IS NULL AND status NOT IN ('completed', 'closed');

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.work_orders IS 'Operational execution unit generated from a Ticket. One ticket may generate multiple work orders.';
COMMENT ON COLUMN public.work_orders.work_order_number IS 'Human-readable unique work order ID (e.g. WO-2026-00001).';
