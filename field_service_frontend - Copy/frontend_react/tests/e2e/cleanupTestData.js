/**
 * Playwright global teardown helper for deleting seeded E2E data.
 */

import { request } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const API_BASE = process.env.E2E_API_BASE || 'http://127.0.0.1:8000'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const STATE_FILE = path.join(__dirname, 'e2e-setup-state.json')
const ADMIN = { email: 'e2e.admin@test.com', password: 'E2eTest9999' }

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function login(ctx) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
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
  throw new Error('Admin login failed during E2E cleanup')
}

async function apiGet(ctx, token, urlPath) {
  const res = await ctx.get(`${API_BASE}${urlPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status(), body }
}

async function apiDelete(ctx, token, urlPath) {
  const res = await ctx.delete(`${API_BASE}${urlPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status(), body }
}

async function cleanupTestData(ctx, token, testRunId) {
  // Use the consolidated cleanup endpoint which removes service requests,
  // audit logs and related E2E artifacts in a single admin call.
  const res = await ctx.post(`${API_BASE}/admin/test/cleanup`, {
    data: { test_run_id: testRunId, dry_run: false, confirm_delete: 'YES_DELETE_E2E_DATA' },
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })

  if (res.status() !== 200) {
    throw new Error(`Cleanup failed: ${res.status()}`)
  }

  const body = await res.json().catch(() => null)
  console.log(`TEST CLEANUP RESULT: ${JSON.stringify(body)}`)
  return { created: 0, deleted: body?.deleted_requests || 0, remaining: [] }
}

export default async function globalTeardown() {
  if (!fs.existsSync(STATE_FILE)) {
    return
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
  const testRunId = state?.testRunId

  if (!testRunId) {
    try {
      fs.unlinkSync(STATE_FILE)
    } catch (_) {
      // ignore
    }
    return
  }

  const ctx = await request.newContext()
  try {
    const token = await login(ctx)
    const result = await cleanupTestData(ctx, token, testRunId)
    console.log(`TEST DATA CREATED: ${result.created}`)
  } catch (e) {
    console.error('Cleanup failed:', e)
  } finally {
    await ctx.dispose()
    try {
      fs.unlinkSync(STATE_FILE)
    } catch (_) {
      // ignore
    }
  }
}
