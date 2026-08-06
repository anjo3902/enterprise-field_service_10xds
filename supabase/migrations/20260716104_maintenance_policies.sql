-- =============================================================================
-- Migration: 20260716104_maintenance_policies.sql
-- Phase:     3.2 — Enterprise Row Level Security
-- Purpose:   RLS for PM, AMC, and Warranty Engine:
--            pm_plans, pm_schedules, amc_contracts, amc_covered_assets,
--            warranty_records, maintenance_history, pm_exceptions
--
-- Isolation Model:
--   org users see all maintenance records for their org
--   vendor users see plans/schedules explicitly assigned to their vendor
-- =============================================================================

-- =============================================================================
-- PM PLANS & SCHEDULES
-- =============================================================================
DROP POLICY IF EXISTS "pm_plans_select" ON public.pm_plans;
CREATE POLICY "pm_plans_select" ON public.pm_plans FOR SELECT USING (
  public.fn_is_platform_admin()
  OR org_id = public.fn_jwt_org_id()
  OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "pm_plans_write" ON public.pm_plans;
CREATE POLICY "pm_plans_write" ON public.pm_plans FOR ALL USING (
  public.fn_is_platform_admin()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
  OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);

DROP POLICY IF EXISTS "pm_schedules_select" ON public.pm_schedules;
CREATE POLICY "pm_schedules_select" ON public.pm_schedules FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.pm_plans p WHERE p.id = pm_schedules.pm_plan_id AND (p.org_id = public.fn_jwt_org_id() OR p.vendor_id = public.fn_jwt_vendor_id()))
);
DROP POLICY IF EXISTS "pm_schedules_write" ON public.pm_schedules;
CREATE POLICY "pm_schedules_write" ON public.pm_schedules FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.pm_plans p WHERE p.id = pm_schedules.pm_plan_id AND (p.org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin') OR (p.vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff')))
);

DROP POLICY IF EXISTS "pm_exceptions_select" ON public.pm_exceptions;
CREATE POLICY "pm_exceptions_select" ON public.pm_exceptions FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.pm_schedules s JOIN public.pm_plans p ON p.id = s.pm_plan_id WHERE s.id = pm_exceptions.pm_schedule_id AND (p.org_id = public.fn_jwt_org_id() OR p.vendor_id = public.fn_jwt_vendor_id()))
);
DROP POLICY IF EXISTS "pm_exceptions_write" ON public.pm_exceptions;
CREATE POLICY "pm_exceptions_write" ON public.pm_exceptions FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.pm_schedules s JOIN public.pm_plans p ON p.id = s.pm_plan_id WHERE s.id = pm_exceptions.pm_schedule_id AND (p.org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin') OR (p.vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff')))
);

-- =============================================================================
-- AMC & WARRANTY
-- =============================================================================
DROP POLICY IF EXISTS "amc_contracts_select" ON public.amc_contracts;
CREATE POLICY "amc_contracts_select" ON public.amc_contracts FOR SELECT USING (
  public.fn_is_platform_admin()
  OR org_id = public.fn_jwt_org_id()
  OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "amc_contracts_write" ON public.amc_contracts;
CREATE POLICY "amc_contracts_write" ON public.amc_contracts FOR ALL USING (
  public.fn_is_platform_admin()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);

DROP POLICY IF EXISTS "amc_assets_select" ON public.amc_covered_assets;
CREATE POLICY "amc_assets_select" ON public.amc_covered_assets FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.amc_contracts c WHERE c.id = amc_covered_assets.amc_contract_id AND (c.org_id = public.fn_jwt_org_id() OR c.vendor_id = public.fn_jwt_vendor_id()))
);
DROP POLICY IF EXISTS "amc_assets_write" ON public.amc_covered_assets;
CREATE POLICY "amc_assets_write" ON public.amc_covered_assets FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.amc_contracts c WHERE c.id = amc_covered_assets.amc_contract_id AND c.org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);

DROP POLICY IF EXISTS "warranty_select" ON public.warranty_records;
CREATE POLICY "warranty_select" ON public.warranty_records FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.assets a WHERE a.id = warranty_records.asset_id AND (a.org_id = public.fn_jwt_org_id() OR EXISTS (SELECT 1 FROM public.contracts c WHERE c.org_id = a.org_id AND c.vendor_id = public.fn_jwt_vendor_id() AND c.status = 'active')))
);
DROP POLICY IF EXISTS "warranty_write" ON public.warranty_records;
CREATE POLICY "warranty_write" ON public.warranty_records FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.assets a WHERE a.id = warranty_records.asset_id AND a.org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);

-- =============================================================================
-- MAINTENANCE HISTORY
-- =============================================================================
DROP POLICY IF EXISTS "maint_history_select" ON public.maintenance_history;
CREATE POLICY "maint_history_select" ON public.maintenance_history FOR SELECT USING (
  public.fn_is_platform_admin()
  OR org_id = public.fn_jwt_org_id()
  OR vendor_id = public.fn_jwt_vendor_id()
  OR technician_id = public.fn_jwt_tech_id()
);
DROP POLICY IF EXISTS "maint_history_insert" ON public.maintenance_history;
CREATE POLICY "maint_history_insert" ON public.maintenance_history FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR vendor_id = public.fn_jwt_vendor_id()
);
