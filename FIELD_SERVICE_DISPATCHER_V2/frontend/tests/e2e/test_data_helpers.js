import { request } from '@playwright/test'

const API_BASE = process.env.E2E_API_BASE || 'http://127.0.0.1:8000'

/**
 * Create a test technician via admin endpoint. Returns { technician_id }
 */
export async function create_test_technician(adminToken, opts = {}) {
  const ctx = await request.newContext()
  try {
    const res = await ctx.post(`${API_BASE}/admin/test/create-technician`, {
      data: { test_run_id: opts.test_run_id, name: opts.name, zone: opts.zone },
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    if (res.status() !== 200) throw new Error(`create_test_technician failed: ${res.status()}`)
    const body = await res.json()
    return body
  } finally {
    await ctx.dispose()
  }
}

/**
 * Create a single test service request. Returns { request_id }
 */
export async function create_test_request(adminToken, opts = {}) {
  const ctx = await request.newContext()
  try {
    const status = opts.status || (opts.assigned_technician ? 'assigned' : 'pending_review')
    const res = await ctx.post(`${API_BASE}/admin/test/create-request`, {
      data: {
        test_run_id: opts.test_run_id,
        assigned_technician: opts.assigned_technician,
        status,
        description: opts.description,
        location_text: opts.location_text,
        location_zone: opts.location_zone,
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    if (res.status() !== 200) throw new Error(`create_test_request failed: ${res.status()}`)
    return await res.json()
  } finally {
    await ctx.dispose()
  }
}

/**
 * Create a small reassignment scenario: creates a technician and a request assigned
 * to them (or uses provided tech id). Returns { technician_id, request_id }.
 */
export async function create_reassignment_scenario(adminToken, opts = {}) {
  const runId = opts.test_run_id
  let techId = opts.technician_id
  if (!techId) {
    const tech = await create_test_technician(adminToken, { test_run_id: runId, name: opts.name, zone: opts.zone })
    techId = tech.technician_id
  }
  const req = await create_test_request(adminToken, { test_run_id: runId, assigned_technician: techId, description: opts.description })
  return { technician_id: techId, request_id: req.request_id }
}

/**
 * Cleanup all test data for a test_run_id via consolidated admin endpoint.
 */
export async function cleanup_test_data(adminToken, test_run_id) {
  const ctx = await request.newContext()
  try {
    const res = await ctx.post(`${API_BASE}/admin/test/cleanup`, {
      data: { test_run_id, dry_run: false, confirm_delete: 'YES_DELETE_E2E_DATA' },
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    if (res.status() !== 200) throw new Error(`cleanup_test_data failed: ${res.status()}`)
    return await res.json()
  } finally {
    await ctx.dispose()
  }
}
