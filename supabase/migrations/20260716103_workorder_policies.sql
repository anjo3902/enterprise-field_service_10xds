-- =============================================================================
-- Migration: 20260716103_workorder_policies.sql
-- Phase:     3.2 — Enterprise Row Level Security
-- Purpose:   RLS for the Work Order Engine:
--            work_orders, work_order_tasks, checklist_templates, checklist_items,
--            work_order_checklist_responses, work_order_parts_used,
--            work_order_labor, service_reports, customer_acceptance
--
-- Isolation Model:
--   vendor_admin / staff → full control over work orders within their vendor
--   technicians          → full control over work orders assigned to them
--   org_admin / user     → read-only visibility into their org's work orders
-- =============================================================================

-- =============================================================================
-- TABLE: work_orders
-- =============================================================================
DROP POLICY IF EXISTS "work_orders_select" ON public.work_orders;
CREATE POLICY "work_orders_select" ON public.work_orders FOR SELECT USING (
  public.fn_is_platform_admin()
  OR org_id = public.fn_jwt_org_id()
  OR vendor_id = public.fn_jwt_vendor_id()
  OR technician_id = public.fn_jwt_tech_id()
);

DROP POLICY IF EXISTS "work_orders_insert" ON public.work_orders;
CREATE POLICY "work_orders_insert" ON public.work_orders FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff'))
);

DROP POLICY IF EXISTS "work_orders_update" ON public.work_orders;
CREATE POLICY "work_orders_update" ON public.work_orders FOR UPDATE USING (
  public.fn_is_platform_admin()
  OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff'))
  OR (technician_id = public.fn_jwt_tech_id() AND public.fn_jwt_role() = 'technician')
);

DROP POLICY IF EXISTS "work_orders_delete" ON public.work_orders;
CREATE POLICY "work_orders_delete" ON public.work_orders FOR DELETE USING (
  public.fn_is_platform_admin()
  OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);

-- =============================================================================
-- TABLE: work_order_tasks
-- =============================================================================
DROP POLICY IF EXISTS "wo_tasks_select" ON public.work_order_tasks;
CREATE POLICY "wo_tasks_select" ON public.work_order_tasks FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_tasks.work_order_id AND (wo.org_id = public.fn_jwt_org_id() OR wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "wo_tasks_insert" ON public.work_order_tasks;
CREATE POLICY "wo_tasks_insert" ON public.work_order_tasks FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_tasks.work_order_id AND (wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "wo_tasks_update" ON public.work_order_tasks;
CREATE POLICY "wo_tasks_update" ON public.work_order_tasks FOR UPDATE USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_tasks.work_order_id AND (wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "wo_tasks_delete" ON public.work_order_tasks;
CREATE POLICY "wo_tasks_delete" ON public.work_order_tasks FOR DELETE USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_tasks.work_order_id AND wo.vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff'))
);

-- =============================================================================
-- CHECKLISTS
-- =============================================================================
-- checklist_templates and items are read-only for technicians/orgs, writable by vendor_admin
DROP POLICY IF EXISTS "chk_templates_select" ON public.checklist_templates;
CREATE POLICY "chk_templates_select" ON public.checklist_templates FOR SELECT USING (
  public.fn_is_platform_admin() OR vendor_id = public.fn_jwt_vendor_id() OR org_id = public.fn_jwt_org_id() OR vendor_id IS NULL
);
DROP POLICY IF EXISTS "chk_templates_write" ON public.checklist_templates;
CREATE POLICY "chk_templates_write" ON public.checklist_templates FOR ALL USING (
  public.fn_is_platform_admin() OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);

DROP POLICY IF EXISTS "chk_items_select" ON public.checklist_items;
CREATE POLICY "chk_items_select" ON public.checklist_items FOR SELECT USING (
  public.fn_is_platform_admin() OR EXISTS (SELECT 1 FROM public.checklist_templates ct WHERE ct.id = checklist_items.template_id AND (ct.vendor_id = public.fn_jwt_vendor_id() OR ct.org_id = public.fn_jwt_org_id() OR ct.vendor_id IS NULL))
);
DROP POLICY IF EXISTS "chk_items_write" ON public.checklist_items;
CREATE POLICY "chk_items_write" ON public.checklist_items FOR ALL USING (
  public.fn_is_platform_admin() OR EXISTS (SELECT 1 FROM public.checklist_templates ct WHERE ct.id = checklist_items.template_id AND ct.vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);

-- Responses are writable by technician / vendor
DROP POLICY IF EXISTS "chk_responses_select" ON public.work_order_checklist_responses;
CREATE POLICY "chk_responses_select" ON public.work_order_checklist_responses FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_checklist_responses.work_order_id AND (wo.org_id = public.fn_jwt_org_id() OR wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "chk_responses_write" ON public.work_order_checklist_responses;
CREATE POLICY "chk_responses_write" ON public.work_order_checklist_responses FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_checklist_responses.work_order_id AND (wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);

-- =============================================================================
-- WORK ORDER PARTS & LABOR
-- =============================================================================
DROP POLICY IF EXISTS "wo_parts_select" ON public.work_order_parts_used;
CREATE POLICY "wo_parts_select" ON public.work_order_parts_used FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_parts_used.work_order_id AND (wo.org_id = public.fn_jwt_org_id() OR wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "wo_parts_write" ON public.work_order_parts_used;
CREATE POLICY "wo_parts_write" ON public.work_order_parts_used FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_parts_used.work_order_id AND (wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);

DROP POLICY IF EXISTS "wo_labor_select" ON public.work_order_labor;
CREATE POLICY "wo_labor_select" ON public.work_order_labor FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_labor.work_order_id AND (wo.org_id = public.fn_jwt_org_id() OR wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "wo_labor_write" ON public.work_order_labor;
CREATE POLICY "wo_labor_write" ON public.work_order_labor FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_labor.work_order_id AND (wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);

-- =============================================================================
-- SERVICE REPORTS & ACCEPTANCE
-- =============================================================================
DROP POLICY IF EXISTS "service_reports_select" ON public.service_reports;
CREATE POLICY "service_reports_select" ON public.service_reports FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = service_reports.work_order_id AND (wo.org_id = public.fn_jwt_org_id() OR wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "service_reports_write" ON public.service_reports;
CREATE POLICY "service_reports_write" ON public.service_reports FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = service_reports.work_order_id AND (wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);

DROP POLICY IF EXISTS "customer_acceptance_select" ON public.customer_acceptance;
CREATE POLICY "customer_acceptance_select" ON public.customer_acceptance FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = customer_acceptance.work_order_id AND (wo.org_id = public.fn_jwt_org_id() OR wo.vendor_id = public.fn_jwt_vendor_id() OR wo.technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "customer_acceptance_insert" ON public.customer_acceptance;
CREATE POLICY "customer_acceptance_insert" ON public.customer_acceptance FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  -- Only org user/admin can sign off
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = customer_acceptance.work_order_id AND wo.org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() IN ('org_admin', 'org_user'))
);
