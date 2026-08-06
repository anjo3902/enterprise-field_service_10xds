-- =============================================================================
-- Migration: 20260716072_notification_preferences.sql
-- Phase:     2.6 — Enterprise Notification & Audit Foundation
-- Purpose:   Create the `notification_preferences` table.
--            User-specific configuration for receiving alerts.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Linkage ───────────────────────────────────────────────────────────────
  -- 1:1 with profiles
  profile_id               UUID          NOT NULL UNIQUE
                             REFERENCES public.profiles (id)
                             ON DELETE CASCADE,

  -- ── Channel Toggles ───────────────────────────────────────────────────────
  email_enabled            BOOLEAN       NOT NULL DEFAULT true,
  push_enabled             BOOLEAN       NOT NULL DEFAULT true,
  sms_enabled              BOOLEAN       NOT NULL DEFAULT false,
  in_app_enabled           BOOLEAN       NOT NULL DEFAULT true,

  -- ── Quiet Hours (JSON for complex rules, or simple text range) ────────────
  -- e.g. "22:00-06:00"
  quiet_hours              TEXT,
  timezone                 TEXT          NOT NULL DEFAULT 'UTC',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_notification_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.notification_preferences IS '1:1 user preferences for how and when they receive notifications.';
