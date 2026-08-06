-- =============================================================================
-- Migration: 20260716107_notification_audit_policies.sql
-- Phase:     3.2 — Enterprise Row Level Security
-- Purpose:   RLS for Notifications, Audit, Timeline, and Events.
-- =============================================================================

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
DROP POLICY IF EXISTS "notif_tpl_select" ON public.notification_templates;
CREATE POLICY "notif_tpl_select" ON public.notification_templates FOR SELECT USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR vendor_id = public.fn_jwt_vendor_id() OR (org_id IS NULL AND vendor_id IS NULL)
);
DROP POLICY IF EXISTS "notif_tpl_write" ON public.notification_templates;
CREATE POLICY "notif_tpl_write" ON public.notification_templates FOR ALL USING (
  public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin') OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);

DROP POLICY IF EXISTS "notif_pref_select" ON public.notification_preferences;
CREATE POLICY "notif_pref_select" ON public.notification_preferences FOR SELECT USING (
  public.fn_is_platform_admin() OR profile_id = auth.uid()
);
DROP POLICY IF EXISTS "notif_pref_write" ON public.notification_preferences;
CREATE POLICY "notif_pref_write" ON public.notification_preferences FOR ALL USING (
  public.fn_is_platform_admin() OR profile_id = auth.uid()
);

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (
  public.fn_is_platform_admin()
  OR recipient_profile_id = auth.uid()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (
  public.fn_is_platform_admin() OR recipient_profile_id = auth.uid()
);
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE USING (
  public.fn_is_platform_admin() OR recipient_profile_id = auth.uid()
);

-- =============================================================================
-- AUDIT & TIMELINE
-- =============================================================================
DROP POLICY IF EXISTS "timeline_select" ON public.activity_timeline;
CREATE POLICY "timeline_select" ON public.activity_timeline FOR SELECT USING (
  public.fn_is_platform_admin()
  OR org_id = public.fn_jwt_org_id()
  OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "timeline_insert" ON public.activity_timeline;
CREATE POLICY "timeline_insert" ON public.activity_timeline FOR INSERT WITH CHECK (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR vendor_id = public.fn_jwt_vendor_id()
);

DROP POLICY IF EXISTS "audit_select" ON public.audit_logs;
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT USING (
  public.fn_is_platform_admin()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
  OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() = 'vendor_admin')
);
DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT WITH CHECK (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR vendor_id = public.fn_jwt_vendor_id()
);

-- =============================================================================
-- EVENTS
-- =============================================================================
-- System admin only for raw event layer
DROP POLICY IF EXISTS "events_all" ON public.platform_events;
CREATE POLICY "events_all" ON public.platform_events FOR ALL USING (public.fn_is_platform_admin());

DROP POLICY IF EXISTS "event_subs_all" ON public.event_subscriptions;
CREATE POLICY "event_subs_all" ON public.event_subscriptions FOR ALL USING (public.fn_is_platform_admin());

DROP POLICY IF EXISTS "event_fail_all" ON public.event_failures;
CREATE POLICY "event_fail_all" ON public.event_failures FOR ALL USING (public.fn_is_platform_admin());
