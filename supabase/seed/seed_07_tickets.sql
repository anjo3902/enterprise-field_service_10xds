-- =============================================================================
-- SEED 07: Tickets & Work Orders
-- Enterprise: NexGen Facilities Management
-- Purpose:    Populate realistic transactional data (Tickets + WOs)
-- Idempotent: ON CONFLICT DO NOTHING
-- =============================================================================

BEGIN;

-- =============================================================================
-- TICKETS
-- Represents user-reported issues or system-generated alerts
-- =============================================================================
INSERT INTO public.tickets (
  id, ticket_number, org_id, site_id, building_id, floor_id, room_id, asset_id,
  department_id, requester_employee_id, vendor_id, assigned_technician_id,
  service_category_id, service_type_id,
  priority, severity, status, title, description, ai_diagnosis,
  sla_policy_id, response_sla_status, resolution_sla_status,
  response_due_at, resolution_due_at, responded_at,
  due_date, completed_at, closed_at, created_at
) VALUES

  -- 1. CRITICAL INCIDENT: Data Center CRAC Failure (Escalated/Overdue)
  (
    '55555555-0000-0000-0000-000000000001', 'TKT-2026-04100',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000005', 'eeeeeeee-0000-0000-0000-000000000004', 'AST-DC-001',
    'a1000000-0000-0000-0000-000000000003', NULL, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
    'Critical', 'Total Failure', 'in_progress', 'CRITICAL: Data Center CRAC-1 Compressor Failure', 'BMS Alert: CRAC Unit 1 has tripped. High temperature alarm in Server Hall A (28C). Request immediate dispatch.',
    '{"fault_code":"CRAC-COMP-TRIP","fault_description":"High pressure switch trip on compressor 1. Likely condenser issue or refrigerant overcharge.","recommendations":["Check condenser water flow","Verify refrigerant pressures","Reset high pressure switch"],"confidence_score":0.92}'::jsonb,
    '30000000-0000-0000-0000-000000000001', 'ok', 'breached',
    now() - INTERVAL '3 hours', now() - INTERVAL '30 minutes', now() - INTERVAL '2 hours 50 minutes',
    now() - INTERVAL '30 minutes', NULL, NULL, now() - INTERVAL '3 hours 10 minutes'
  ),

  -- 2. HIGH PRIORITY: ICU Humidity Issue (In Progress)
  (
    '55555555-0000-0000-0000-000000000002', 'TKT-2026-04101',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000006', 'dddddddd-0000-0000-0000-000000000008', 'eeeeeeee-0000-0000-0000-000000000006', 'AST-MED-001',
    'a1000000-0000-0000-0000-000000000004', NULL, '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
    'High', 'Degraded', 'in_progress', 'High Humidity in ICU Ward A', 'Nurses reporting high humidity and condensation on windows. Temperature is holding at 22C but RH is 70%.',
    '{"fault_code":"HVAC-DEHUM-FAIL","fault_description":"Loss of dehumidification control. Chilled water valve may be stuck or reheat coil failed.","recommendations":["Check chilled water valve operation","Test reheat coil contactor","Verify BMS setpoints"],"confidence_score":0.85}'::jsonb,
    '30000000-0000-0000-0000-000000000002', 'ok', 'warning',
    now() - INTERVAL '1 hour', now() + INTERVAL '2 hours', now() - INTERVAL '1 hour 45 minutes',
    now() + INTERVAL '2 hours', NULL, NULL, now() - INTERVAL '2 hours'
  ),

  -- 3. MEDIUM PRIORITY: Elevator Noise (Assigned / Scheduled)
  (
    '55555555-0000-0000-0000-000000000003', 'TKT-2026-04102',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000010', NULL, NULL, 'AST-RET-001',
    'a1000000-0000-0000-0000-000000000008', NULL, '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000025',
    '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000019',
    'Medium', 'Degraded', 'assigned', 'Unusual Noise from Mall Escalator 1', 'Grinding noise heard from the bottom pit of the escalator when running upwards. Stopped as a precaution.',
    NULL,
    '30000000-0000-0000-0000-000000000003', 'ok', 'ok',
    now() + INTERVAL '4 hours', now() + INTERVAL '20 hours', now() - INTERVAL '30 minutes',
    now() + INTERVAL '20 hours', NULL, NULL, now() - INTERVAL '4 hours'
  ),

  -- 4. LOW PRIORITY: Light Replacement (Open / Unassigned)
  (
    '55555555-0000-0000-0000-000000000004', 'TKT-2026-04103',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', NULL, NULL,
    'a1000000-0000-0000-0000-000000000001', NULL, NULL, NULL,
    '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006',
    'Low', 'Cosmetic', 'open', 'Flickering Lights in Reception', 'Two LED panels in the main reception area are flickering constantly.',
    NULL,
    '30000000-0000-0000-0000-000000000004', 'ok', 'ok',
    now() + INTERVAL '23 hours', now() + INTERVAL '71 hours', NULL,
    now() + INTERVAL '71 hours', NULL, NULL, now() - INTERVAL '1 hour'
  ),

  -- 5. COMPLETED: Power Trip in Tech Park (Closed)
  (
    '55555555-0000-0000-0000-000000000005', 'TKT-2026-04088',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000004', NULL, NULL, NULL,
    'a1000000-0000-0000-0000-000000000003', NULL, '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006',
    'High', 'Total Failure', 'closed', 'Power loss to Level 3 IT Labs', 'Main breaker for Level 3 has tripped. Reset attempted but trips immediately.',
    '{"fault_code":"ELEC-SHORT","fault_description":"Dead short on phase B.","recommendations":["Megger test cables","Isolate loads"],"confidence_score":0.99}'::jsonb,
    '30000000-0000-0000-0000-000000000002', 'ok', 'ok',
    now() - INTERVAL '44 hours', now() - INTERVAL '40 hours', now() - INTERVAL '47 hours 50 minutes',
    now() - INTERVAL '40 hours', now() - INTERVAL '43 hours', now() - INTERVAL '42 hours', now() - INTERVAL '48 hours'
  )
ON CONFLICT (ticket_number) DO NOTHING;

-- =============================================================================
-- WORK ORDERS
-- Child execution tasks derived from the Tickets above
-- =============================================================================
INSERT INTO public.work_orders (
  id, work_order_number, ticket_id,
  org_id, site_id, building_id, floor_id, room_id, asset_id,
  vendor_id, technician_id, service_category_id, service_type_id,
  priority, status,
  scheduled_start_at, scheduled_end_at, estimated_duration_mins,
  travel_started_at, arrived_at, actual_start_at, actual_end_at, completed_at,
  resolution_summary, root_cause, created_at
) VALUES

  -- WO 1: (From TKT-1) CRAC Failure - Tech is ON SITE working (status: in_progress)
  (
    '66666666-0000-0000-0000-000000000001', 'WO-2026-05120', '55555555-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000005', 'eeeeeeee-0000-0000-0000-000000000004', 'AST-DC-001',
    '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
    'Critical', 'in_progress',
    now() - INTERVAL '2 hours', now() + INTERVAL '2 hours', 240,
    now() - INTERVAL '2 hours', now() - INTERVAL '1 hour 15 minutes', now() - INTERVAL '1 hour 10 minutes', NULL, NULL,
    NULL, NULL, now() - INTERVAL '3 hours'
  ),

  -- WO 2: (From TKT-2) ICU Humidity - Tech is TRAVELING (status: en_route)
  (
    '66666666-0000-0000-0000-000000000002', 'WO-2026-05121', '55555555-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000006', 'dddddddd-0000-0000-0000-000000000008', 'eeeeeeee-0000-0000-0000-000000000006', 'AST-MED-001',
    '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
    'High', 'en_route',
    now() + INTERVAL '30 minutes', now() + INTERVAL '2 hours 30 minutes', 120,
    now() - INTERVAL '15 minutes', NULL, NULL, NULL, NULL,
    NULL, NULL, now() - INTERVAL '1 hour 45 minutes'
  ),

  -- WO 3: (From TKT-3) Elevator Noise - Tech ASSIGNED, not started yet (status: assigned)
  (
    '66666666-0000-0000-0000-000000000003', 'WO-2026-05122', '55555555-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000010', NULL, NULL, 'AST-RET-001',
    '11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000019',
    'Medium', 'assigned',
    now() + INTERVAL '2 hours', now() + INTERVAL '6 hours', 240,
    NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, now() - INTERVAL '3 hours'
  ),

  -- WO 4: (From TKT-5) Power Trip - COMPLETED
  (
    '66666666-0000-0000-0000-000000000004', 'WO-2026-05110', '55555555-0000-0000-0000-000000000005',
    'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000004', NULL, NULL, NULL,
    '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006',
    'High', 'closed',
    now() - INTERVAL '47 hours', now() - INTERVAL '43 hours', 240,
    now() - INTERVAL '47 hours', now() - INTERVAL '46 hours 15 minutes', now() - INTERVAL '46 hours', now() - INTERVAL '43 hours', now() - INTERVAL '43 hours',
    'Replaced faulty 100A RCBO on distribution board B. Tested insulation resistance on circuit 3. All normal.', 'Component failure - internal short circuit in RCBO casing.', now() - INTERVAL '48 hours'
  )
ON CONFLICT (work_order_number) DO NOTHING;

COMMIT;
