-- =============================================================================
-- Migration: 20260716061_dispatch_events.sql
-- Phase:     2.4 — Enterprise Dispatch & Scheduling Engine
-- Purpose:   Create the `dispatch_events` table.
--            Immutable, append-only event log for every state change in the
--            dispatch lifecycle. Powers the ticket timeline and audit trail.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dispatch_events (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  dispatch_schedule_id     UUID          NOT NULL
                             REFERENCES public.dispatch_schedules (id)
                             ON DELETE CASCADE,

  -- ── Event Details ─────────────────────────────────────────────────────────
  -- e.g. "dispatched", "accepted", "rejected", "en_route", "arrived",
  --      "checked_in", "completed", "cancelled", "location_update"
  event_type               TEXT          NOT NULL,
  
  event_timestamp          TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- ── Spatial Context ───────────────────────────────────────────────────────
  latitude                 NUMERIC(10,7),
  longitude                NUMERIC(10,7),

  -- ── Actor ─────────────────────────────────────────────────────────────────
  triggered_by             UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  remarks                  TEXT
  
  -- ── Intentionally no updated_at — this table is append-only ───────────────
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dispatch_events_schedule_id
  ON public.dispatch_events (dispatch_schedule_id, event_timestamp DESC);

COMMENT ON TABLE public.dispatch_events IS 'Immutable event log for every state change in the dispatch lifecycle.';
