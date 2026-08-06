-- =============================================================================
-- Migration: 20260716099_enable_rls.sql
-- Phase:     3.2 — Enterprise Row Level Security
-- Purpose:   Enable RLS on ALL business tables AND create reusable JWT helper
--            functions consumed by every subsequent RLS policy migration.
--
-- JWT Helper Functions:
--   fn_is_platform_admin()  → BOOLEAN   (true for system_admin)
--   fn_jwt_role()           → TEXT      (app_role claim)
--   fn_jwt_org_id()         → UUID|NULL (org_id claim)
--   fn_jwt_vendor_id()      → UUID|NULL (vendor_id claim)
--   fn_jwt_tech_id()        → UUID|NULL (tech_id claim)
--
-- Design Principle:
--   EVERY policy checks fn_is_platform_admin() FIRST.
--   If TRUE, the system_admin gets through unconditionally.
--   Tenant isolation is then applied at the second condition.
-- =============================================================================

-- =============================================================================
-- SECTION 1: JWT Claim Helper Functions
-- These are STABLE SQL functions — PostgreSQL caches the result once per query,
-- making them safe and performant to call inside RLS policy expressions.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean, false)
$$;

CREATE OR REPLACE FUNCTION public.fn_jwt_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'app_role', '')
$$;

CREATE OR REPLACE FUNCTION public.fn_jwt_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'org_id', '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.fn_jwt_vendor_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'vendor_id', '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.fn_jwt_tech_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'tech_id', '')::uuid
$$;

COMMENT ON FUNCTION public.fn_is_platform_admin IS 'Returns true if the current JWT carries is_platform_admin=true (system_admin role).';
COMMENT ON FUNCTION public.fn_jwt_role          IS 'Returns the app_role claim from the current JWT.';
COMMENT ON FUNCTION public.fn_jwt_org_id        IS 'Returns the org_id claim from the current JWT, or NULL.';
COMMENT ON FUNCTION public.fn_jwt_vendor_id     IS 'Returns the vendor_id claim from the current JWT, or NULL.';
COMMENT ON FUNCTION public.fn_jwt_tech_id       IS 'Returns the tech_id claim from the current JWT, or NULL.';

-- =============================================================================
-- SECTION 2: Enable RLS on ALL Business Tables
-- =============================================================================

-- ── Phase 1A — Core Foundation ───────────────────────────────────────────────
ALTER TABLE public.organizations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts               ENABLE ROW LEVEL SECURITY;

-- ── Phase 1A — Developer 2 Legacy Tables ─────────────────────────────────────
ALTER TABLE public.assets                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.healthscores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_history           ENABLE ROW LEVEL SECURITY;

-- ── Phase 1B.1 — Facility Hierarchy ──────────────────────────────────────────
ALTER TABLE public.sites                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms                   ENABLE ROW LEVEL SECURITY;

-- ── Phase 1B.2 — SLA Engine ──────────────────────────────────────────────────
ALTER TABLE public.business_hours          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday_calendar        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_policies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priority_matrix         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_category_sla_mapping ENABLE ROW LEVEL SECURITY;

-- ── Phase 1B.3 — Service Catalog ─────────────────────────────────────────────
ALTER TABLE public.service_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_capabilities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_skills       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_coverage_areas   ENABLE ROW LEVEL SECURITY;

-- ── Phase 1B.4 — Organization Structure ──────────────────────────────────────
ALTER TABLE public.business_units          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_contacts   ENABLE ROW LEVEL SECURITY;

-- ── Phase 2.1 — Ticket Engine ────────────────────────────────────────────────
ALTER TABLE public.tickets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_status_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_watchers         ENABLE ROW LEVEL SECURITY;

-- ── Phase 2.2 — Work Order Engine ────────────────────────────────────────────
ALTER TABLE public.work_orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_parts_used   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_labor        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_acceptance     ENABLE ROW LEVEL SECURITY;

-- ── Phase 2.3 — PM, AMC, Warranty ────────────────────────────────────────────
ALTER TABLE public.pm_plans                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_schedules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_contracts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_covered_assets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_exceptions           ENABLE ROW LEVEL SECURITY;

-- ── Phase 2.4 — Dispatch Engine ──────────────────────────────────────────────
ALTER TABLE public.dispatch_queues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_queue_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_shifts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_workload     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_events         ENABLE ROW LEVEL SECURITY;

-- ── Phase 2.5 — Inventory ────────────────────────────────────────────────────
ALTER TABLE public.warehouses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stock         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_request_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_reservations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_consumption       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_inventory    ENABLE ROW LEVEL SECURITY;

-- ── Phase 2.6 — Notifications, Audit, Events ────────────────────────────────
ALTER TABLE public.notification_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_timeline       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_failures          ENABLE ROW LEVEL SECURITY;

-- ── Phase 2.7 — AI Intelligence Layer ───────────────────────────────────────
ALTER TABLE public.ai_models               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_library       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_diagnosis_cache      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hitl_queue              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cost_tracking        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_metrics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feature_flags        ENABLE ROW LEVEL SECURITY;

-- ── Phase 2.8 — Analytics & KPI ─────────────────────────────────────────────
ALTER TABLE public.kpi_definitions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_snapshots           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_analytics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_analytics           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analytics            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_analytics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_analytics      ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SECTION 3: FORCE RLS even for table owners (prevents superuser bypass)
-- =============================================================================
ALTER TABLE public.organizations           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tickets                 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.assets                  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs              FORCE ROW LEVEL SECURITY;
