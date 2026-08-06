/**
 * Playwright global setup - deterministic E2E data seed.
 */

const { request } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const API_BASE = 'http://127.0.0.1:8000'
const STATE_FILE = path.join(__dirname, 'e2e-setup-state.json')
const REQUIRED_PENDING = 40
const TEST_RUN_ID = Date.now().toString()

const TEST_ACCOUNTS = {
  technician: { email: 'e2e.tech@test.com', password: 'E2eTest9999' },
  admin: { email: 'e2e.admin@test.com', password: 'E2eTest9999' },
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function login(ctx, creds) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await ctx.post(`${API_BASE}/auth/login`, { data: creds })
      if (!res.ok()) {
        throw new Error(`Login ${creds.email} -> ${res.status()}: ${await res.text()}`)
      }
      const json = await res.json()
      return json.token || json.access_token
    } catch (err) {
      if (attempt === 3) throw err
      await sleep(2000 * attempt)
    }
  }
}

async function apiGet(ctx, token, urlPath) {
  const res = await ctx.get(`${API_BASE}${urlPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status(), body }
}

async function apiPost(ctx, token, urlPath, data) {
  const res = await ctx.post(`${API_BASE}${urlPath}`, {
    data,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status(), body }
}

async function createSeedTechnician(ctx, adminToken) {
  const res = await apiPost(ctx, adminToken, '/admin/test/create-technician', {
    test_run_id: TEST_RUN_ID,
    name: 'Etwo Technician',
    zone: 'E2E-Zone',
  })

  if (res.status !== 200) {
    throw new Error(`[setup] /admin/test/create-technician failed (${res.status}): ${JSON.stringify(res.body)}`)
  }

  return Number(res.body?.technician_id)
}

async function seedTestData(ctx, adminToken, technicianId) {
  const seed = await apiPost(ctx, adminToken, '/admin/test/seed', {
    pending_count: REQUIRED_PENDING,
    technician_id: technicianId,
    hitl_assigned_count: 10,
    test_run_id: TEST_RUN_ID,
  })

  if (seed.status !== 200) {
    throw new Error(`[setup] /admin/test/seed failed (${seed.status}): ${JSON.stringify(seed.body)}`)
  }

  console.log(`TEST DATA CREATED: ${seed.body?.created_count || 0} (test_run_id=${TEST_RUN_ID})`)
  return seed.body?.created_ids || []
}

module.exports = async function globalSetup() {
  const ctx = await request.newContext()
  const state = { createdIds: [], technicianId: null, testRunId: TEST_RUN_ID }

  try {
    console.log('[setup] Logging in as admin and technician')
    const adminToken = await login(ctx, TEST_ACCOUNTS.admin)
    const techToken = await login(ctx, TEST_ACCOUNTS.technician)

    const technicianId = await createSeedTechnician(ctx, adminToken)
    const techCode = `E2E-${TEST_RUN_ID}-${technicianId}`
    const link = await apiPost(ctx, techToken, '/technician/link-profile', {
      technician_code: techCode,
    })
    if (link.status !== 200) {
      throw new Error(`[setup] technician link failed (${link.status}): ${JSON.stringify(link.body)}`)
    }
    state.technicianId = technicianId

    const createdIds = await seedTestData(ctx, adminToken, technicianId)
    state.createdIds = createdIds

    const kpis = await apiGet(ctx, adminToken, '/admin/kpis')
    const jobs = await apiGet(ctx, techToken, '/technician/jobs')

    const pending = Number(kpis.body?.pending_hitl || 0)
    const activeJobs = Array.isArray(jobs.body?.jobs) ? jobs.body.jobs.length : 0

    console.log(`SETUP CHECK: pending_hitl=${pending}, technician_active_jobs=${activeJobs}`)

    if (pending < 1) {
      throw new Error('[setup] Expected at least one pending HITL item after seeding')
    }
    if (activeJobs < 1) {
      throw new Error('[setup] Expected at least one assigned technician job after seeding')
    }

    console.log('[setup] Global setup completed')
  } finally {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8')
    await ctx.dispose()
  }
}
