-- =============================================================================
-- Migration: 20260716040_ticket_watchers.sql
-- Phase:     2.1 — Enterprise Ticket Engine
-- Purpose:   Create the `ticket_watchers` table.
--            Any profile can subscribe to follow ticket updates.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_watchers (
  ticket_id                UUID          NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  profile_id               UUID          NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,

  -- ── Notification Preferences ──────────────────────────────────────────────
  -- JSONB allows fine-grained control:
  -- { "status_changes": true, "comments": true, "assignments": false, "sla_breach": true }
  notification_prefs       JSONB         NOT NULL DEFAULT '{"status_changes": true, "comments": true}',

  -- ── Audit ─────────────────────────────────────────────────────────────────
  added_by                 UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  added_at                 TIMESTAMPTZ   NOT NULL DEFAULT now(),

  PRIMARY KEY (ticket_id, profile_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ticket_watchers_profile_id
  ON public.ticket_watchers (profile_id);

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.ticket_watchers IS 'Profiles watching a ticket for notifications.';
