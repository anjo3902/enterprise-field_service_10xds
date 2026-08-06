-- =============================================================================
-- Migration: 20260716052_maintenance_history.sql
-- Phase:     2.3 — Enterprise PM, AMC, & Warranty Engine
-- Purpose:   Create the `maintenance_history` table.
--            A unified, denormalized view of all maintenance performed on an asset.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.maintenance_history (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Target Asset ──────────────────────────────────────────────────────────
  asset_id                 UUID          NOT NULL
                             REFERENCES public.assets (id)
                             ON DELETE CASCADE,

  -- ── Source References (Which system generated this history?) ──────────────
  ticket_id                UUID          REFERENCES public.tickets (id) ON DELETE SET NULL,
  work_order_id            UUID          REFERENCES public.work_orders (id) ON DELETE SET NULL,
  pm_schedule_id           UUID          REFERENCES public.pm_schedules (id) ON DELETE SET NULL,
  amc_contract_id          UUID          REFERENCES public.amc_contracts (id) ON DELETE SET NULL,
  warranty_id              UUID          REFERENCES public.warranty_records (id) ON DELETE SET NULL,

  -- ── Denormalized Execution Data ───────────────────────────────────────────
  maintenance_type         TEXT          NOT NULL,               -- e.g. "Preventive", "Corrective", "Warranty Repair"
  completed_by_id          UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  completed_at             TIMESTAMPTZ   NOT NULL,
  
  total_cost               NUMERIC(14,2) DEFAULT 0.00,
  remarks                  TEXT,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_maintenance_history_asset_id
  ON public.maintenance_history (asset_id, completed_at DESC);

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.maintenance_history IS 'Unified, immutable log of all maintenance actions performed on an asset across all subsystems.';
