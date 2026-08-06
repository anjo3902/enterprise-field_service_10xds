-- =============================================================================
-- Migration: 20260716001_enum_types.sql
-- Phase:     1A — Enterprise Database Foundation
-- Purpose:   Define all PostgreSQL ENUM types used across the entire platform.
--            Enums are declared first because every subsequent table depends on them.
--            All types are prefixed to avoid collisions with system types.
--            Adding new values to an ENUM later uses ALTER TYPE … ADD VALUE which
--            is safe in PostgreSQL 12+ (transactional via pg_catalog).
-- =============================================================================

-- Guard: only create if not already present
-- user_role — drives JWT custom claims and all RLS policies
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'system_admin',   -- Platform-level super user (10xDS staff)
    'org_admin',      -- Organization administrator
    'org_user',       -- Organization standard user
    'vendor_admin',   -- Vendor administrator
    'vendor_staff',   -- Vendor standard user
    'technician'      -- Field technician (mobile-first)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- entity_status — shared across orgs, vendors, profiles
DO $$ BEGIN
  CREATE TYPE public.entity_status AS ENUM (
    'active',
    'suspended',
    'pending_setup',
    'pending_approval',
    'inactive',
    'trial'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- subscription_tier — organizations billing plan
DO $$ BEGIN
  CREATE TYPE public.subscription_tier AS ENUM (
    'trial',
    'professional',
    'enterprise'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- service_domain — trade category taxonomy.
-- Mirrors FaultTaxonomy from shared/fault-taxonomy.ts exactly.
DO $$ BEGIN
  CREATE TYPE public.service_domain AS ENUM (
    'HVAC',
    'ELECTRICAL',
    'PLUMBING',
    'FIRE_SAFETY',
    'MECHANICAL',
    'IT_SYSTEMS',
    'SECURITY_SYSTEMS',
    'CIVIL_WORKS',
    'ELEVATORS'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ticket_priority — AI-resolved and human-overridable
DO $$ BEGIN
  CREATE TYPE public.ticket_priority AS ENUM (
    'Critical',
    'High',
    'Medium',
    'Low'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ticket_status — all 19 lifecycle states (16 frontend + 3 internal)
DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM (
    'open',
    'pending_vendor_review',
    'approved',
    'assigned',
    'technician_accepted',
    'travelling',
    'arrived',
    'checked_in',
    'on_site',
    'in_progress',
    'work_order_generated',
    'completed',
    'report_submitted',
    'vendor_review',
    'org_acceptance',
    'closed',
    'rejected',
    'reassigned',
    'escalated',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- hitl_decision — Human-in-the-Loop approval states
DO $$ BEGIN
  CREATE TYPE public.hitl_decision AS ENUM (
    'pending',
    'approved',
    'rejected',
    'modify_approve'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- sla_status — live SLA health indicator per ticket
DO $$ BEGIN
  CREATE TYPE public.sla_status AS ENUM (
    'ok',
    'at_risk',
    'breached',
    'resolved'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- tech_availability — real-time technician state (feeds Realtime channel)
DO $$ BEGIN
  CREATE TYPE public.tech_availability AS ENUM (
    'available',
    'on_job',
    'unavailable',
    'off_duty',
    'break'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- experience_level — technician seniority, used in OR-Tools dispatch scoring
DO $$ BEGIN
  CREATE TYPE public.experience_level AS ENUM (
    'junior_technician',
    'technician',
    'senior_technician',
    'field_engineer',
    'specialist'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pm_status — all PM lifecycle states matching PMStatus frontend enum
DO $$ BEGIN
  CREATE TYPE public.pm_status AS ENUM (
    'requested',
    'pending_review',
    'approved',
    'planning',
    'work_order_created',
    'technician_assigned',
    'accepted',
    'travelling',
    'arrived',
    'maintenance_started',
    'inspection',
    'checklist_in_progress',
    'waiting_customer_confirmation',
    'completed',
    'cancelled',
    'rejected',
    'missed',
    'overdue',
    'rescheduled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- pm_recurrence — PM schedule frequency
DO $$ BEGIN
  CREATE TYPE public.pm_recurrence AS ENUM (
    'one_time',
    'weekly',
    'monthly',
    'quarterly',
    'semi_annual',
    'annual',
    'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- work_order_status
DO $$ BEGIN
  CREATE TYPE public.work_order_status AS ENUM (
    'open',
    'in_progress',
    'completed',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- quotation_status — vendor quotation lifecycle
DO $$ BEGIN
  CREATE TYPE public.quotation_status AS ENUM (
    'draft',
    'sent',
    'accepted',
    'rejected',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- quotation_type — maps to AssetRenewalsScreen tabs
DO $$ BEGIN
  CREATE TYPE public.quotation_type AS ENUM (
    'service',
    'amc',
    'warranty'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- amc_status — AMC contract lifecycle (12 states from frontend)
DO $$ BEGIN
  CREATE TYPE public.amc_status AS ENUM (
    'request_received',
    'under_review',
    'quote_generated',
    'waiting_approval',
    'approved',
    'schedule_technician',
    'activate_contract',
    'generate_invoice',
    'active',
    'expired',
    'terminated'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- warranty_status — warranty renewal lifecycle (11 states from frontend)
DO $$ BEGIN
  CREATE TYPE public.warranty_status AS ENUM (
    'new_request',
    'under_review',
    'inspection_required',
    'inspection_scheduled',
    'inspection_completed',
    'quotation_generated',
    'quotation_sent',
    'customer_approved',
    'rejected',
    'activated',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- asset_status — operational state of a physical asset
DO $$ BEGIN
  CREATE TYPE public.asset_status AS ENUM (
    'operational',
    'degraded',
    'failed',
    'under_maintenance',
    'decommissioned'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- asset_health — human-readable health bucket (from AssetContext.ts)
DO $$ BEGIN
  CREATE TYPE public.asset_health AS ENUM (
    'Healthy',
    'At Risk',
    'Warning',
    'Critical',
    'Under Maintenance'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- opportunity_type — revenue intelligence categories
DO $$ BEGIN
  CREATE TYPE public.opportunity_type AS ENUM (
    'amc_renewal',
    'warranty_expiry',
    'frequent_breakdown',
    'preventive_maintenance',
    'consumables_replacement',
    'iot_monitoring',
    'energy_optimization'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- opportunity_status — revenue opportunity workflow
DO $$ BEGIN
  CREATE TYPE public.opportunity_status AS ENUM (
    'new',
    'action_started',
    'completed',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- approval_status — generic approval gate
DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- dispatch_method — how a technician was selected
DO $$ BEGIN
  CREATE TYPE public.dispatch_method AS ENUM (
    'auto',
    'hitl_approved',
    'manual_override'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- audit_action — immutable event type for audit log
DO $$ BEGIN
  CREATE TYPE public.audit_action AS ENUM (
    'created',
    'updated',
    'deleted',
    'suspended',
    'reactivated',
    'dispatched',
    'approved',
    'rejected',
    'login',
    'logout',
    'failed_login',
    'password_changed',
    'permission_changed',
    'data_exported'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- audit_entity_type — which domain object was acted on
DO $$ BEGIN
  CREATE TYPE public.audit_entity_type AS ENUM (
    'ticket',
    'technician',
    'vendor',
    'organization',
    'asset',
    'contract',
    'pm_schedule',
    'work_order',
    'quotation',
    'amc_contract',
    'warranty_renewal',
    'sla_policy',
    'user',
    'platform',
    'ai_model'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- security_alert_type — platform security monitoring
DO $$ BEGIN
  CREATE TYPE public.security_alert_type AS ENUM (
    'failed_login',
    'suspicious_session',
    'permission_change',
    'data_export',
    'brute_force',
    'account_locked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- notification_category — push / email notification routing
DO $$ BEGIN
  CREATE TYPE public.notification_category AS ENUM (
    'ticket',
    'pm',
    'amc',
    'warranty',
    'sla',
    'revenue',
    'security',
    'platform',
    'ai',
    'technician'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- reassignment_status — technician reassignment workflow
DO $$ BEGIN
  CREATE TYPE public.reassignment_status AS ENUM (
    'requested',
    'processing',
    'completed',
    'rejected',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- license_status — platform license validity
DO $$ BEGIN
  CREATE TYPE public.license_status AS ENUM (
    'active',
    'expired',
    'revoked',
    'trial'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- iot_reading_type — sensor telemetry types
DO $$ BEGIN
  CREATE TYPE public.iot_reading_type AS ENUM (
    'temperature',
    'vibration',
    'power_draw',
    'pressure',
    'runtime',
    'humidity',
    'noise_level',
    'flow_rate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- risk_level — AI-derived risk classification
DO $$ BEGIN
  CREATE TYPE public.risk_level AS ENUM (
    'Low',
    'Medium',
    'High',
    'Critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- breach_type — which SLA window was breached
DO $$ BEGIN
  CREATE TYPE public.breach_type AS ENUM (
    'response',
    'resolution'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- severity_level — AI-derived ticket severity
DO $$ BEGIN
  CREATE TYPE public.severity_level AS ENUM (
    'Low',
    'Medium',
    'High',
    'Critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- Trigger helper: auto-update updated_at on any row mutation.
-- Created once here; referenced by all subsequent migration files.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
