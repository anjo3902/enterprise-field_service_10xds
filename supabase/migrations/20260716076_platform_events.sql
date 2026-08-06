-- =============================================================================
-- Migration: 20260716076_platform_events.sql
-- Phase:     2.6 — Enterprise Notification & Audit Foundation
-- Purpose:   Create the `platform_events` table.
--            Foundation for the EventBus. Asynchronous message queuing.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_events (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Event Identity ────────────────────────────────────────────────────────
  event_name               TEXT          NOT NULL,               -- e.g. "ticket.created", "sla.breached"
  event_category           TEXT          NOT NULL,               -- e.g. "Ticket", "SLA", "User"
  event_source             TEXT          NOT NULL,               -- e.g. "db_trigger", "api", "cron"
  correlation_id           UUID,                                 -- Ties multiple events to one transaction

  -- ── Data ──────────────────────────────────────────────────────────────────
  payload                  JSONB         NOT NULL,

  -- ── State ─────────────────────────────────────────────────────────────────
  -- e.g. "pending", "processed", "failed"
  status                   TEXT          NOT NULL DEFAULT 'pending',

  -- ── Timestamps ────────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  processed_at             TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_platform_events_status
  ON public.platform_events (status, created_at)
  WHERE status = 'pending';

COMMENT ON TABLE  public.platform_events IS 'EventBus foundation for asynchronous processing and webhooks. Append-only generation.';
