-- =============================================================================
-- Migration: 20260716043_work_order_checklist.sql
-- Phase:     2.2 — Enterprise Work Order & Service Execution Engine
-- Purpose:   Create `checklist_templates`, `checklist_items`, and
--            `work_order_checklist_responses` tables.
--            Templates define the structure; responses capture field values.
-- =============================================================================

-- ── 1. Checklist Templates ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID          REFERENCES public.organizations (id) ON DELETE CASCADE,
  service_type_id          UUID          REFERENCES public.service_types (id) ON DELETE SET NULL,
  name                     TEXT          NOT NULL,
  description              TEXT,
  status                   public.entity_status NOT NULL DEFAULT 'active',
  created_by               UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ
);

CREATE TRIGGER trg_checklist_templates_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.checklist_templates IS 'Reusable checklist definitions scoped to service types.';

-- ── 2. Checklist Items (Template Structure) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id              UUID          NOT NULL
                             REFERENCES public.checklist_templates (id)
                             ON DELETE CASCADE,
  item_label               TEXT          NOT NULL,
  -- e.g. "text", "boolean", "number", "select", "photo"
  response_type            TEXT          NOT NULL DEFAULT 'text',
  is_required              BOOLEAN       NOT NULL DEFAULT true,
  sequence                 INT           NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_template_id
  ON public.checklist_items (template_id, sequence);

COMMENT ON TABLE public.checklist_items IS 'Individual items in a checklist template.';

-- ── 3. Work Order Checklist Responses ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.work_order_checklist_responses (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id            UUID          NOT NULL
                             REFERENCES public.work_orders (id)
                             ON DELETE CASCADE,
  checklist_item_id        UUID          NOT NULL
                             REFERENCES public.checklist_items (id)
                             ON DELETE CASCADE,

  -- The captured field value (stored as text; parsed by app layer per response_type)
  value                    TEXT,
  remarks                  TEXT,
  completed_by             UUID          REFERENCES public.profiles (id) ON DELETE SET NULL,
  completed_at             TIMESTAMPTZ,

  CONSTRAINT uq_wo_checklist_response UNIQUE (work_order_id, checklist_item_id)
);

CREATE INDEX IF NOT EXISTS idx_wo_checklist_responses_wo_id
  ON public.work_order_checklist_responses (work_order_id);

COMMENT ON TABLE public.work_order_checklist_responses IS 'Technician-captured responses for each checklist item on a work order.';
