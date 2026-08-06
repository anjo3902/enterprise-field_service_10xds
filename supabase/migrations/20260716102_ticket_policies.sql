-- =============================================================================
-- Migration: 20260716102_ticket_policies.sql
-- Phase:     3.2 — Enterprise Row Level Security
-- Purpose:   RLS for the Ticket Engine:
--            tickets, ticket_status_history, ticket_tags, ticket_attachments,
--            ticket_comments, ticket_assignments, ticket_watchers
--
-- Isolation Model:
--   org users    → see only their org's tickets
--   vendor users → see only tickets assigned to their vendor
--   technicians  → see only tickets on their assigned work orders
--   watchers     → org-level users who subscribe to a ticket get SELECT
-- =============================================================================

-- =============================================================================
-- TABLE: tickets
-- =============================================================================
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
CREATE POLICY "tickets_select" ON public.tickets FOR SELECT USING (
  public.fn_is_platform_admin()
  -- Org users see all their org's tickets
  OR org_id = public.fn_jwt_org_id()
  -- Vendor sees tickets explicitly assigned to them
  OR vendor_id = public.fn_jwt_vendor_id()
  -- Technician sees ticket for any work order they are assigned to
  OR assigned_technician_id = public.fn_jwt_tech_id()
);

DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
CREATE POLICY "tickets_insert" ON public.tickets FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() IN ('org_admin', 'org_user'))
);

DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
CREATE POLICY "tickets_update" ON public.tickets FOR UPDATE USING (
  public.fn_is_platform_admin()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() IN ('org_admin', 'org_user'))
  -- Vendor can update status, assignment on their tickets
  OR (vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff'))
  -- Technician can update status on tickets they own
  OR (assigned_technician_id = public.fn_jwt_tech_id() AND public.fn_jwt_role() = 'technician')
);

DROP POLICY IF EXISTS "tickets_delete" ON public.tickets;
CREATE POLICY "tickets_delete" ON public.tickets FOR DELETE USING (
  public.fn_is_platform_admin()
  OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);

-- =============================================================================
-- TABLE: ticket_status_history  (append-only; no UPDATE or DELETE)
-- =============================================================================
DROP POLICY IF EXISTS "ticket_history_select" ON public.ticket_status_history;
CREATE POLICY "ticket_history_select" ON public.ticket_status_history FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.tickets t WHERE t.id = ticket_status_history.ticket_id
    AND (t.org_id = public.fn_jwt_org_id() OR t.vendor_id = public.fn_jwt_vendor_id() OR t.assigned_technician_id = public.fn_jwt_tech_id())
  )
);
DROP POLICY IF EXISTS "ticket_history_insert" ON public.ticket_status_history;
CREATE POLICY "ticket_history_insert" ON public.ticket_status_history FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.tickets t WHERE t.id = ticket_status_history.ticket_id
    AND (t.org_id = public.fn_jwt_org_id() OR t.vendor_id = public.fn_jwt_vendor_id() OR t.assigned_technician_id = public.fn_jwt_tech_id())
  )
);

-- =============================================================================
-- TABLE: ticket_tags
-- =============================================================================
DROP POLICY IF EXISTS "ticket_tags_select" ON public.ticket_tags;
CREATE POLICY "ticket_tags_select" ON public.ticket_tags FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_tags.ticket_id AND (t.org_id = public.fn_jwt_org_id() OR t.vendor_id = public.fn_jwt_vendor_id()))
);
DROP POLICY IF EXISTS "ticket_tags_write" ON public.ticket_tags;
CREATE POLICY "ticket_tags_write" ON public.ticket_tags FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_tags.ticket_id AND (t.org_id = public.fn_jwt_org_id() OR t.vendor_id = public.fn_jwt_vendor_id()))
);

-- =============================================================================
-- TABLE: ticket_attachments
-- =============================================================================
DROP POLICY IF EXISTS "ticket_attachments_select" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_select" ON public.ticket_attachments FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_attachments.ticket_id AND (t.org_id = public.fn_jwt_org_id() OR t.vendor_id = public.fn_jwt_vendor_id() OR t.assigned_technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "ticket_attachments_insert" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_insert" ON public.ticket_attachments FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_attachments.ticket_id AND (t.org_id = public.fn_jwt_org_id() OR t.vendor_id = public.fn_jwt_vendor_id() OR t.assigned_technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "ticket_attachments_delete" ON public.ticket_attachments;
CREATE POLICY "ticket_attachments_delete" ON public.ticket_attachments FOR DELETE USING (
  public.fn_is_platform_admin() OR uploaded_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_attachments.ticket_id AND t.org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);

-- =============================================================================
-- TABLE: ticket_comments
-- =============================================================================
DROP POLICY IF EXISTS "ticket_comments_select" ON public.ticket_comments;
CREATE POLICY "ticket_comments_select" ON public.ticket_comments FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_comments.ticket_id AND (t.org_id = public.fn_jwt_org_id() OR t.vendor_id = public.fn_jwt_vendor_id() OR t.assigned_technician_id = public.fn_jwt_tech_id()))
  -- Exclude internal vendor comments from org users
  OR (is_internal = false AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_comments.ticket_id AND t.org_id = public.fn_jwt_org_id()))
);
DROP POLICY IF EXISTS "ticket_comments_insert" ON public.ticket_comments;
CREATE POLICY "ticket_comments_insert" ON public.ticket_comments FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_comments.ticket_id AND (t.org_id = public.fn_jwt_org_id() OR t.vendor_id = public.fn_jwt_vendor_id() OR t.assigned_technician_id = public.fn_jwt_tech_id()))
);
DROP POLICY IF EXISTS "ticket_comments_update" ON public.ticket_comments;
CREATE POLICY "ticket_comments_update" ON public.ticket_comments FOR UPDATE USING (
  public.fn_is_platform_admin() OR commenter_id = auth.uid()
);
DROP POLICY IF EXISTS "ticket_comments_delete" ON public.ticket_comments;
CREATE POLICY "ticket_comments_delete" ON public.ticket_comments FOR DELETE USING (
  public.fn_is_platform_admin() OR commenter_id = auth.uid()
);

-- =============================================================================
-- TABLE: ticket_assignments
-- =============================================================================
DROP POLICY IF EXISTS "ticket_assignments_select" ON public.ticket_assignments;
CREATE POLICY "ticket_assignments_select" ON public.ticket_assignments FOR SELECT USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_assignments.ticket_id AND (t.org_id = public.fn_jwt_org_id() OR t.vendor_id = public.fn_jwt_vendor_id()))
  OR assigned_to = auth.uid()
);
DROP POLICY IF EXISTS "ticket_assignments_write" ON public.ticket_assignments;
CREATE POLICY "ticket_assignments_write" ON public.ticket_assignments FOR ALL USING (
  public.fn_is_platform_admin()
  OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_assignments.ticket_id AND (t.org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin') OR (t.vendor_id = public.fn_jwt_vendor_id() AND public.fn_jwt_role() IN ('vendor_admin', 'vendor_staff')))
);

-- =============================================================================
-- TABLE: ticket_watchers
-- =============================================================================
DROP POLICY IF EXISTS "ticket_watchers_select" ON public.ticket_watchers;
CREATE POLICY "ticket_watchers_select" ON public.ticket_watchers FOR SELECT USING (
  public.fn_is_platform_admin()
  OR profile_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_watchers.ticket_id AND t.org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() = 'org_admin')
);
DROP POLICY IF EXISTS "ticket_watchers_insert" ON public.ticket_watchers;
CREATE POLICY "ticket_watchers_insert" ON public.ticket_watchers FOR INSERT WITH CHECK (
  public.fn_is_platform_admin()
  OR profile_id = auth.uid()
  OR (public.fn_jwt_role() = 'org_admin' AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_watchers.ticket_id AND t.org_id = public.fn_jwt_org_id()))
);
DROP POLICY IF EXISTS "ticket_watchers_delete" ON public.ticket_watchers;
CREATE POLICY "ticket_watchers_delete" ON public.ticket_watchers FOR DELETE USING (
  public.fn_is_platform_admin() OR profile_id = auth.uid()
);
