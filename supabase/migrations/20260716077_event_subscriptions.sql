-- =============================================================================
-- Migration: 20260716077_event_subscriptions.sql
-- Phase:     2.6 — Enterprise Notification & Audit Foundation
-- Purpose:   Create the `event_subscriptions` table.
--            Defines which services (or webhooks) listen to which Platform Events.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.event_subscriptions (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Target ────────────────────────────────────────────────────────────────
  event_name               TEXT          NOT NULL,               -- e.g. "ticket.created" or "*"
  subscriber               TEXT          NOT NULL,               -- e.g. "email_service", "webhook_target_1"

  -- ── Transport ─────────────────────────────────────────────────────────────
  -- e.g. "edge_function", "webhook", "internal_queue"
  delivery_channel         TEXT          NOT NULL,
  
  -- Max retries before dead-lettering
  retry_count              INT           NOT NULL DEFAULT 3,

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   public.entity_status NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ,
  
  CONSTRAINT uq_event_subscription UNIQUE (event_name, subscriber)
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_event_subscriptions_updated_at
  BEFORE UPDATE ON public.event_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.event_subscriptions IS 'Registry of subscribers listening to Platform Events.';
