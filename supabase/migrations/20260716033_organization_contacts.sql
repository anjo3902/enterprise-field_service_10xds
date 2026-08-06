-- =============================================================================
-- Migration: 20260716033_organization_contacts.sql
-- Phase:     1B.4 — Enterprise Organization Structure
-- Purpose:   Create the `organization_contacts` table.
--            Identifies key stakeholders for escalation and approval logic.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_contacts (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ── Ownership ─────────────────────────────────────────────────────────────
  org_id                   UUID          NOT NULL UNIQUE
                             REFERENCES public.organizations (id)
                             ON DELETE CASCADE,

  -- ── Key Stakeholders ──────────────────────────────────────────────────────
  primary_contact_id       UUID          REFERENCES public.employees (id) ON DELETE SET NULL,
  escalation_contact_id    UUID          REFERENCES public.employees (id) ON DELETE SET NULL,
  facilities_head_id       UUID          REFERENCES public.employees (id) ON DELETE SET NULL,
  it_head_id               UUID          REFERENCES public.employees (id) ON DELETE SET NULL,
  security_head_id         UUID          REFERENCES public.employees (id) ON DELETE SET NULL,
  finance_contact_id       UUID          REFERENCES public.employees (id) ON DELETE SET NULL,

  -- ── Audit Fields ──────────────────────────────────────────────────────────
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

-- ── updated_at Trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_organization_contacts_updated_at
  BEFORE UPDATE ON public.organization_contacts
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.organization_contacts IS 'Centralized registry of key organizational stakeholders for automated workflows.';
