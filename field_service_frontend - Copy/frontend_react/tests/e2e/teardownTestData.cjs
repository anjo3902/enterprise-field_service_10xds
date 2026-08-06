/**
 * Playwright global teardown - cleanup seeded E2E records.
 * Uses test_run_id to query and delete all test data created during this test run.
 */

const { request } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const API_BASE = 'http://127.0.0.1:8000'
const STATE_FILE = path.join(__dirname, 'e2e-setup-state.json')
const ADMIN = { email: 'e2e.admin@test.com', password: 'E2eTest9999' }

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function login(ctx) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await ctx.post(`${API_BASE}/auth/login`, { data: ADMIN })
      if (res.ok()) {
        const json = await res.json()
        return json.token || json.access_token
      }
    } catch (_) {
      // retry
    }
    await sleep(2000 * attempt)
  }
  throw new Error('[teardown] Admin login failed')
}

async function cleanupTestData(ctx, token, testRunId) {
  console.log(`[teardown] Fetching test data for test_run_id=${testRunId}`)
  
  const res = await ctx.get(`${API_BASE}/admin/test-data?test_run_id=${testRunId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok()) {
    throw new Error(`[teardown] Failed to fetch test data: ${res.status()}`)
  }

  const data = await res.json().catch(() => ({ records: [] }))
  const records = Array.isArray(data.records) ? data.records : []

  console.log(`[teardown] Found ${records.length} test records to clean`)

  let deleted = 0
  for (const item of records) {
    try {
      const delRes = await ctx.delete(`${API_BASE}/admin/service-requests/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (delRes.ok()) {
        deleted += 1
      }
    } catch (err) {
      console.error(`[teardown] Failed to delete ${item.id}:`, err.message)
    }
  }

  console.log(`[teardown] TEST DATA DELETED: ${deleted}/${records.length}`)
  return deleted
}

module.exports = async function globalTeardown() {
  if (!fs.existsSync(STATE_FILE)) {
    console.log('[teardown] No state file found, skipping cleanup')
    return
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
  const testRunId = state.testRunId

  if (!testRunId) {
    console.log('[teardown] No test_run_id found in state, skipping cleanup')
    try { fs.unlinkSync(STATE_FILE) } catch (_) {}
    return
  }

  const ctx = await request.newContext()
  try {
    const token = await login(ctx)
    await cleanupTestData(ctx, token, testRunId)
  } catch (err) {
    console.error('[teardown] Cleanup failed:', err.message)
    // Don't throw - allow teardown to complete even if cleanup fails
  } finally {
    await ctx.dispose()
    try { fs.unlinkSync(STATE_FILE) } catch (_) {}
  }
}
