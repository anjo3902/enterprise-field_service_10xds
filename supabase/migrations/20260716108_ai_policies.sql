-- =============================================================================
-- Migration: 20260716108_ai_policies.sql
-- Phase:     3.2 — Enterprise Row Level Security
-- Purpose:   RLS for the Enterprise AI layer.
-- =============================================================================

-- =============================================================================
-- AI CONFIG & MODELS
-- =============================================================================
DROP POLICY IF EXISTS "ai_models_select" ON public.ai_models;
CREATE POLICY "ai_models_select" ON public.ai_models FOR SELECT USING (true); -- Public read to all authenticated
DROP POLICY IF EXISTS "ai_models_write" ON public.ai_models;
CREATE POLICY "ai_models_write" ON public.ai_models FOR ALL USING (public.fn_is_platform_admin());

DROP POLICY IF EXISTS "ai_prompts_select" ON public.ai_prompt_library;
CREATE POLICY "ai_prompts_select" ON public.ai_prompt_library FOR SELECT USING (true);
DROP POLICY IF EXISTS "ai_prompts_write" ON public.ai_prompt_library;
CREATE POLICY "ai_prompts_write" ON public.ai_prompt_library FOR ALL USING (public.fn_is_platform_admin());

DROP POLICY IF EXISTS "ai_flags_select" ON public.ai_feature_flags;
CREATE POLICY "ai_flags_select" ON public.ai_feature_flags FOR SELECT USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "ai_flags_write" ON public.ai_feature_flags;
CREATE POLICY "ai_flags_write" ON public.ai_feature_flags FOR ALL USING (public.fn_is_platform_admin());

-- =============================================================================
-- AI REQUESTS & CACHE
-- =============================================================================
DROP POLICY IF EXISTS "ai_requests_select" ON public.ai_requests;
CREATE POLICY "ai_requests_select" ON public.ai_requests FOR SELECT USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR vendor_id = public.fn_jwt_vendor_id()
);
DROP POLICY IF EXISTS "ai_requests_insert" ON public.ai_requests;
CREATE POLICY "ai_requests_insert" ON public.ai_requests FOR INSERT WITH CHECK (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR vendor_id = public.fn_jwt_vendor_id()
);

DROP POLICY IF EXISTS "ai_cache_all" ON public.ai_diagnosis_cache;
CREATE POLICY "ai_cache_all" ON public.ai_diagnosis_cache FOR ALL USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id()
);

-- =============================================================================
-- HITL & FEEDBACK
-- =============================================================================
DROP POLICY IF EXISTS "hitl_select" ON public.hitl_queue;
CREATE POLICY "hitl_select" ON public.hitl_queue FOR SELECT USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id()
);
DROP POLICY IF EXISTS "hitl_write" ON public.hitl_queue;
CREATE POLICY "hitl_write" ON public.hitl_queue FOR ALL USING (
  public.fn_is_platform_admin() OR (org_id = public.fn_jwt_org_id() AND public.fn_jwt_role() IN ('org_admin', 'org_user'))
);

DROP POLICY IF EXISTS "ai_feedback_select" ON public.ai_feedback;
CREATE POLICY "ai_feedback_select" ON public.ai_feedback FOR SELECT USING (
  public.fn_is_platform_admin() OR reviewer_id = auth.uid() OR org_id = public.fn_jwt_org_id()
);
DROP POLICY IF EXISTS "ai_feedback_insert" ON public.ai_feedback;
CREATE POLICY "ai_feedback_insert" ON public.ai_feedback FOR INSERT WITH CHECK (
  public.fn_is_platform_admin() OR reviewer_id = auth.uid()
);

DROP POLICY IF EXISTS "ai_recs_select" ON public.ai_recommendations;
CREATE POLICY "ai_recommendations_select" ON public.ai_recommendations FOR SELECT USING (
  public.fn_is_platform_admin() OR org_id = public.fn_jwt_org_id() OR vendor_id = public.fn_jwt_vendor_id()
);

-- =============================================================================
-- METRICS (System Admin only)
-- =============================================================================
DROP POLICY IF EXISTS "ai_cost_all" ON public.ai_cost_tracking;
CREATE POLICY "ai_cost_all" ON public.ai_cost_tracking FOR ALL USING (public.fn_is_platform_admin());

DROP POLICY IF EXISTS "ai_metrics_all" ON public.ai_model_metrics;
CREATE POLICY "ai_metrics_all" ON public.ai_model_metrics FOR ALL USING (public.fn_is_platform_admin());
