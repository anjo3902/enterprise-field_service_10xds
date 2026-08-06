-- =============================================================================
-- Migration: 20260716058_dispatch_schedules.sql
-- Phase:     2.4 — Enterprise Dispatch & Scheduling Engine
-- Purpose:   Create the `dispatch_schedules` table.
--            A confirmed dispatch assignment — links a Work Order to a specific
--            Technician with travel time estimation and dispatch status tracking.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dispatch_schedules (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkages ──────────────────────────────────────────────────────────────
  work_order_id            UUID          NOT NULL
                             REFERENCES public.work_orders (id)
                             ON DELETE CASCADE,
  technician_id            UUID          NOT NULL
                             REFERENCES public.technicians (id)
                             ON DELETE CASCADE,
  vendor_id                UUID          REFERENCES public.vendors (id) ON DELETE SET NULL,

  -- ── Scheduled Window ──────────────────────────────────────────────────────
  scheduled_start_at       TIMESTAMPTZ   NOT NULL,
  scheduled_end_at         TIMESTAMPTZ   NOT NULL,

  -- ── Travel Estimates ──────────────────────────────────────────────────────
  estimated_travel_mins    INT,
  estimated_arrival_at     TIMESTAMPTZ,

  -- ── Live Status ───────────────────────────────────────────────────────────
  -- e.g. "pending", "confirmed", "en_route", "arrived", "cancelled"
  route_status             TEXT          NOT NULL DEFAULT 'pending',
  -- e.g. "scheduled", "dispatched", "accepted", "rejected", "completed"
  dispatch_status          TEXT          NOT NULL DEFAULT 'scheduled',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,

  CONSTRAINT chk_dispatch_schedule_order
    CHECK (scheduled_end_at > scheduled_start_at)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dispatch_schedules_tech_date
  ON public.dispatch_schedules (technician_id, scheduled_start_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dispatch_schedules_wo_id
  ON public.dispatch_schedules (work_order_id)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_dispatch_schedules_updated_at
  BEFORE UPDATE ON public.dispatch_schedules
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.dispatch_schedules IS 'Confirmed dispatch assignments linking Work Orders to Technicians with travel estimation.';
