-- =============================================================================
-- Migration: 20260716105_dispatch_policies.sql
-- Phase:     3.2 — Enterprise Row Level Security
-- Purpose:   RLS for Dispatch Engine:
--            dispatch_queues, dispatch_queue_items, technician_shifts,
--            technician_availability, dispatch_schedules, route_assignments,
--            technician_workload, dispatch_events
--
-- Isolation Model:
--   This module is heavily vendor-centric.
--   Org users have limited read-only visibility into schedules.
--   Technicians see only their own schedules and availability.
-- =============================================================================

-- =============================================================================
-- DISPATCH QUEUES
-- =============================================================================
DROP POLICY IF EXISTS "dispatch_queues_select" ON public.dispatch_queues;
CREATE POLICY "dispatch_queues_select" ON public.dispatch_queues FOR SELECT USING (
  public.fn_is_platform_admin()
  OR vendor_id = public.fn_jwt_vendor_id()
  OR (org_id = public.fn_jwt_org_id() AND vendor_id IS NULL)
);
DROP POLICY IF EXISTS "dispatch_queues_write" ON public.dispatch_queues;
CREATE POLICY "dispatch_queues_write" ON public.dispatch_queues FOR ALL USING (
  public.fn_is_platform_admin()
  OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
  OR (org_id = public.fn_jwt_org_id() AND vendor_id IS NULL AND public.fn_jwt_role() = 'org_admin')
);

DROP POLICY IF EXISTS "dispatch_items_select" ON public.dispatch_queue_items;
CREATE POLICY "dispatch_items_select" ON public.dispatch_queue_items FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.dispatch_queues q WHERE q.id = dispatch_queue_items.queue_id AND (q.vendor_id = public.fn_jwt_vendor_id() OR (q.org_id = public.fn_jwt_org_id() AND q.vendor_id IS NULL)))
);
DROP POLICY IF EXISTS "dispatch_items_write" ON public.dispatch_queue_items;
CREATE POLICY "dispatch_items_write" ON public.dispatch_queue_items FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.dispatch_queues q WHERE q.id = dispatch_queue_items.queue_id AND (q.vendor_id = public.fn_jwt_vendor_id() OR (q.org_id = public.fn_jwt_org_id() AND q.vendor_id IS NULL)))
);

-- =============================================================================
-- TECHNICIAN AVAILABILITY & SHIFTS
-- =============================================================================
DROP POLICY IF EXISTS "tech_shifts_select" ON public.technician_shifts;
CREATE POLICY "tech_shifts_select" ON public.technician_shifts FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = technician_shifts.technician_id AND t.vendor_id = public.fn_jwt_vendor_id())
  OR technician_id = public.fn_jwt_tech_id()
);
DROP POLICY IF EXISTS "tech_shifts_write" ON public.technician_shifts;
CREATE POLICY "tech_shifts_write" ON public.technician_shifts FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = technician_shifts.technician_id AND t.vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);

DROP POLICY IF EXISTS "tech_avail_select" ON public.technician_availability;
CREATE POLICY "tech_avail_select" ON public.technician_availability FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = technician_availability.technician_id AND t.vendor_id = public.fn_jwt_vendor_id())
  OR technician_id = public.fn_jwt_tech_id()
);
DROP POLICY IF EXISTS "tech_avail_write" ON public.technician_availability;
CREATE POLICY "tech_avail_write" ON public.technician_availability FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = technician_availability.technician_id AND t.vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff'))
  OR (technician_id = public.fn_jwt_tech_id() AND public.fn_jwt_role() = 'technician')
);

-- =============================================================================
-- DISPATCH SCHEDULES & ROUTES
-- =============================================================================
DROP POLICY IF EXISTS "dispatch_schedules_select" ON public.dispatch_schedules;
CREATE POLICY "dispatch_schedules_select" ON public.dispatch_schedules FOR SELECT USING (
  public.fn_is_platform_admin()
  OR vendor_id = public.fn_jwt_vendor_id()
  OR technician_id = public.fn_jwt_tech_id()
  OR org_id = public.fn_jwt_org_id()
);
DROP POLICY IF EXISTS "dispatch_schedules_write" ON public.dispatch_schedules;
CREATE POLICY "dispatch_schedules_write" ON public.dispatch_schedules FOR ALL USING (
  public.fn_is_platform_admin()
  OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff'))
);

DROP POLICY IF EXISTS "routes_select" ON public.route_assignments;
CREATE POLICY "routes_select" ON public.route_assignments FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.dispatch_schedules ds WHERE ds.id = route_assignments.dispatch_schedule_id AND (ds.vendor_id = public.fn_jwt_vendor_id() OR ds.technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "routes_write" ON public.route_assignments;
CREATE POLICY "routes_write" ON public.route_assignments FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.dispatch_schedules ds WHERE ds.id = route_assignments.dispatch_schedule_id AND ds.vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff'))
);

-- =============================================================================
-- WORKLOAD & EVENTS
-- =============================================================================
DROP POLICY IF EXISTS "tech_workload_select" ON public.technician_workload;
CREATE POLICY "tech_workload_select" ON public.technician_workload FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = technician_workload.technician_id AND t.vendor_id = public.fn_jwt_vendor_id())
  OR technician_id = public.fn_jwt_tech_id()
);
DROP POLICY IF EXISTS "tech_workload_write" ON public.technician_workload;
CREATE POLICY "tech_workload_write" ON public.technician_workload FOR ALL USING (
  public.fn_is_platform_admin()
); -- Managed by triggers/functions

DROP POLICY IF EXISTS "dispatch_events_select" ON public.dispatch_events;
CREATE POLICY "dispatch_events_select" ON public.dispatch_events FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.dispatch_schedules ds WHERE ds.id = dispatch_events.dispatch_schedule_id AND (ds.vendor_id = public.fn_jwt_vendor_id() OR ds.technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "dispatch_events_insert" ON public.dispatch_events;
CREATE POLICY "dispatch_events_insert" ON public.dispatch_events FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.dispatch_schedules ds WHERE ds.id = dispatch_events.dispatch_schedule_id AND (ds.vendor_id = public.fn_jwt_vendor_id() OR ds.technician_id = public.fn_jwt_tech_id()))
);
