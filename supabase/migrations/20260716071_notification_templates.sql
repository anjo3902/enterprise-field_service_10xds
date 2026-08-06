-- =============================================================================
-- Migration: 20260716071_notification_templates.sql
-- Phase:     2.6 — Enterprise Notification & Audit Foundation
-- Purpose:   Create the `notification_templates` table.
--            Defines the structure for emails, SMS, and push notifications.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────────────────────
  template_code            TEXT          NOT NULL UNIQUE,        -- e.g. "TICKET_CREATED_ORG"
  name                     TEXT          NOT NULL,

  -- ── Configuration ─────────────────────────────────────────────────────────
  -- e.g. "email", "sms", "push", "in_app"
  channel                  TEXT          NOT NULL,
  
  -- The template content
  subject                  TEXT,
  body                     TEXT          NOT NULL,
  
  -- Array of expected variable names (e.g. ["ticket_id", "status"])
  variables                TEXT[]        DEFAULT '{}',
  
  language                 TEXT          NOT NULL DEFAULT 'en',
  version                  INT           NOT NULL DEFAULT 1,

  -- ── Status ────────────────────────────────────────────────────────────────
  status                   public.entity_status NOT NULL DEFAULT 'active',

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  deleted_at               TIMESTAMPTZ   DEFAULT NULL,
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notification_templates_code
  ON public.notification_templates (template_code, channel)
  WHERE deleted_at IS NULL;

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE  public.notification_templates IS 'Templates for emails, SMS, push, and in-app notifications.';
