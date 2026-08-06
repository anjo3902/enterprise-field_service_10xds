-- =============================================================================
-- SEED 04: User Profiles (Demo Login Accounts)
-- Enterprise: NexGen Facilities Management
-- Purpose:    Create profiles for all demo users
--
-- CRITICAL: Profiles.id must match auth.users.id in Supabase.
-- These are placeholder UUIDs that must be linked to real auth.users rows.
-- Run the Auth setup SQL in Supabase Dashboard → SQL Editor after this seed.
--
-- DEMO ACCOUNTS:
--   admin@nexgenfm.com          / Demo@1234!  (org_admin)
--   fm.manager@nexgenfm.com     / Demo@1234!  (org_user)
--   helpdesk@nexgenfm.com       / Demo@1234!  (org_user)
--   samer@apexclimate.ae        / Demo@1234!  (vendor_admin)
--   ravi@powersafe.ae           / Demo@1234!  (vendor_admin)
--   rahul.sharma@apexclimate.ae / Demo@1234!  (technician)
--   john.david@powersafe.ae     / Demo@1234!  (technician)
--   emeka.okonkwo@fireguard.ae  / Demo@1234!  (technician)
-- =============================================================================

BEGIN;

-- =============================================================================
-- ORG ADMIN PROFILES
-- =============================================================================
INSERT INTO public.profiles (
  id, full_name, first_name, last_name, email, phone, role,
  org_id, vendor_id, tech_id, assigned_entity_id, assigned_entity_type,
  status, last_login_at, notification_preferences, theme, language, created_at
) VALUES

  -- Primary Org Admin
  (
    'ffffffff-0000-0000-0000-000000000001',
    'Arjun Mehta', 'Arjun', 'Mehta', 'admin@nexgenfm.com', '+971-50-100-2001',
    'org_admin',
    'aaaaaaaa-0000-0000-0000-000000000001', NULL, NULL,
    'aaaaaaaa-0000-0000-0000-000000000001', 'org',
    'active', now() - INTERVAL '2 hours',
    '{"push": true, "email": true, "sms": true}'::jsonb, 'dark', 'en', now() - INTERVAL '18 months'
  ),

  -- FM Manager
  (
    'ffffffff-0000-0000-0000-000000000002',
    'Riya Patel', 'Riya', 'Patel', 'fm.manager@nexgenfm.com', '+971-50-100-2002',
    'org_user',
    'aaaaaaaa-0000-0000-0000-000000000001', NULL, NULL,
    'aaaaaaaa-0000-0000-0000-000000000001', 'org',
    'active', now() - INTERVAL '1 hour',
    '{"push": true, "email": true, "sms": false}'::jsonb, 'light', 'en', now() - INTERVAL '15 months'
  ),

  -- Helpdesk Agent
  (
    'ffffffff-0000-0000-0000-000000000003',
    'Sameer Al-Hajj', 'Sameer', 'Al-Hajj', 'helpdesk@nexgenfm.com', '+971-50-100-2003',
    'org_user',
    'aaaaaaaa-0000-0000-0000-000000000001', NULL, NULL,
    'aaaaaaaa-0000-0000-0000-000000000001', 'org',
    'active', now() - INTERVAL '30 minutes',
    '{"push": true, "email": false, "sms": false}'::jsonb, 'system', 'en', now() - INTERVAL '10 months'
  ),

  -- Building Manager
  (
    'ffffffff-0000-0000-0000-000000000004',
    'Lina Johansson', 'Lina', 'Johansson', 'building.mgr@nexgenfm.com', '+971-50-100-2004',
    'org_user',
    'aaaaaaaa-0000-0000-0000-000000000001', NULL, NULL,
    'aaaaaaaa-0000-0000-0000-000000000001', 'org',
    'active', now() - INTERVAL '3 hours',
    '{"push": true, "email": true, "sms": false}'::jsonb, 'light', 'en', now() - INTERVAL '8 months'
  )

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VENDOR ADMIN PROFILES
-- =============================================================================
INSERT INTO public.profiles (
  id, full_name, first_name, last_name, email, phone, role,
  org_id, vendor_id, tech_id, assigned_entity_id, assigned_entity_type,
  status, last_login_at, notification_preferences, theme, language, created_at
) VALUES

  -- Apex Climate Control admin
  (
    'ffffffff-0000-0000-0000-000000000011',
    'Samer Al-Rashidi', 'Samer', 'Al-Rashidi', 'samer@apexclimate.ae', '+971-50-201-0011',
    'vendor_admin',
    NULL, '11111111-0000-0000-0000-000000000001', NULL,
    '11111111-0000-0000-0000-000000000001', 'vendor',
    'active', now() - INTERVAL '4 hours',
    '{"push": true, "email": true, "sms": true}'::jsonb, 'dark', 'en', now() - INTERVAL '24 months'
  ),

  -- PowerSafe Electrical admin
  (
    'ffffffff-0000-0000-0000-000000000012',
    'Ravi Kumar', 'Ravi', 'Kumar', 'ravi@powersafe.ae', '+971-50-202-0022',
    'vendor_admin',
    NULL, '11111111-0000-0000-0000-000000000002', NULL,
    '11111111-0000-0000-0000-000000000002', 'vendor',
    'active', now() - INTERVAL '6 hours',
    '{"push": true, "email": true, "sms": false}'::jsonb, 'light', 'en', now() - INTERVAL '20 months'
  ),

  -- FireGuard admin
  (
    'ffffffff-0000-0000-0000-000000000013',
    'James Okonkwo', 'James', 'Okonkwo', 'james@fireguard.ae', '+971-50-204-0044',
    'vendor_admin',
    NULL, '11111111-0000-0000-0000-000000000004', NULL,
    '11111111-0000-0000-0000-000000000004', 'vendor',
    'active', now() - INTERVAL '2 hours',
    '{"push": true, "email": true, "sms": true}'::jsonb, 'system', 'en', now() - INTERVAL '22 months'
  )

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TECHNICIAN PROFILES (linked to technicians table)
-- =============================================================================
INSERT INTO public.profiles (
  id, full_name, first_name, last_name, email, phone, role,
  org_id, vendor_id, tech_id, assigned_entity_id, assigned_entity_type,
  status, last_login_at, notification_preferences, theme, language, created_at
) VALUES

  -- Rahul Sharma — Apex HVAC Senior Tech
  (
    'ffffffff-0000-0000-0000-000000000021',
    'Rahul Sharma', 'Rahul', 'Sharma', 'rahul.sharma@apexclimate.ae', '+971-55-301-0001',
    'technician',
    NULL, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001', 'vendor',
    'active', now() - INTERVAL '30 minutes',
    '{"push": true, "email": false, "sms": true}'::jsonb, 'dark', 'en', now() - INTERVAL '24 months'
  ),

  -- John David — PowerSafe Electrical Specialist
  (
    'ffffffff-0000-0000-0000-000000000022',
    'John David', 'John', 'David', 'john.david@powersafe.ae', '+971-55-302-0009',
    'technician',
    NULL, '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000009',
    '11111111-0000-0000-0000-000000000002', 'vendor',
    'active', now() - INTERVAL '1 hour',
    '{"push": true, "email": false, "sms": true}'::jsonb, 'system', 'en', now() - INTERVAL '36 months'
  ),

  -- Emeka Okonkwo — FireGuard Fire Safety Specialist
  (
    'ffffffff-0000-0000-0000-000000000023',
    'Emeka Okonkwo', 'Emeka', 'Okonkwo', 'emeka.okonkwo@fireguard.ae', '+971-55-304-0021',
    'technician',
    NULL, '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000021',
    '11111111-0000-0000-0000-000000000004', 'vendor',
    'active', now() - INTERVAL '2 hours',
    '{"push": true, "email": false, "sms": false}'::jsonb, 'light', 'en', now() - INTERVAL '30 months'
  ),

  -- Suresh Babu — Apex Chiller Specialist
  (
    'ffffffff-0000-0000-0000-000000000024',
    'Suresh Babu', 'Suresh', 'Babu', 'suresh.babu@apexclimate.ae', '+971-55-301-0003',
    'technician',
    NULL, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000001', 'vendor',
    'active', now() - INTERVAL '45 minutes',
    '{"push": true, "email": true, "sms": true}'::jsonb, 'dark', 'en', now() - INTERVAL '24 months'
  ),

  -- Fernando Costa — LiftTech Elevator Specialist
  (
    'ffffffff-0000-0000-0000-000000000025',
    'Fernando Costa', 'Fernando', 'Costa', 'fernando.costa@lifttech.ae', '+971-55-305-0024',
    'technician',
    NULL, '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000024',
    '11111111-0000-0000-0000-000000000005', 'vendor',
    'active', now() - INTERVAL '90 minutes',
    '{"push": true, "email": false, "sms": true}'::jsonb, 'system', 'en', now() - INTERVAL '36 months'
  )

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Link vendor.manager_id to profile IDs
-- =============================================================================
UPDATE public.vendors SET manager_id = 'ffffffff-0000-0000-0000-000000000011' WHERE id = '11111111-0000-0000-0000-000000000001';
UPDATE public.vendors SET manager_id = 'ffffffff-0000-0000-0000-000000000012' WHERE id = '11111111-0000-0000-0000-000000000002';
UPDATE public.vendors SET manager_id = 'ffffffff-0000-0000-0000-000000000013' WHERE id = '11111111-0000-0000-0000-000000000004';

-- =============================================================================
-- Link technician.user_id to profile IDs
-- =============================================================================
UPDATE public.technicians SET user_id = 'ffffffff-0000-0000-0000-000000000021' WHERE id = '22222222-0000-0000-0000-000000000001';
UPDATE public.technicians SET user_id = 'ffffffff-0000-0000-0000-000000000022' WHERE id = '22222222-0000-0000-0000-000000000009';
UPDATE public.technicians SET user_id = 'ffffffff-0000-0000-0000-000000000023' WHERE id = '22222222-0000-0000-0000-000000000021';
UPDATE public.technicians SET user_id = 'ffffffff-0000-0000-0000-000000000024' WHERE id = '22222222-0000-0000-0000-000000000003';
UPDATE public.technicians SET user_id = 'ffffffff-0000-0000-0000-000000000025' WHERE id = '22222222-0000-0000-0000-000000000024';

COMMIT;
