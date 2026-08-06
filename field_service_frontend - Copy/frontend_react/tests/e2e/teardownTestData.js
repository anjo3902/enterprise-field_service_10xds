/**
 * Playwright global teardown — cleans up all E2E test records after the suite.
 *
 * Reads tests/e2e/e2e-setup-state.json (written by setupTestData.js) and
 * rejects / cancels every seeded record so the database stays tidy.
 */

import { request } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const API_BASE   = 'http://127.0.0.1:8000'
const STATE_FILE = path.join(__dirname, 'e2e-setup-state.json')

const ADMIN = { email: 'e2e.admin@test.com', password: 'E2eTest9999' }

async function login(ctx) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await ctx.post(`${API_BASE}/auth/login`, { data: ADMIN })
      if (res.ok()) {
        const j = await res.json()
        return j.token || j.access_token
      }
    } catch (_) {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt))
  }
  throw new Error('[teardown] Admin login failed after 3 attempts')
}

export default async function globalTeardown(_config) {
  if (!fs.existsSync(STATE_FILE)) {
    console.log('[teardown] No state file found — nothing to clean up')
    return
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
  const ids = state.createdIds ?? []

  if (ids.length === 0) {
    console.log('[teardown] No seeded records to clean up')
    fs.unlinkSync(STATE_FILE)
    return
  }

  const ctx = await request.newContext()
  try {
    const token = await login(ctx)

    let cleaned = 0
    for (const id of ids) {
      // Fetch current status — skip if already cancelled/completed
      const getRes = await ctx.get(`${API_BASE}/admin/service-requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!getRes.ok()) continue

      const rec = await getRes.json().catch(() => null)
      if (!rec) continue

      const status = String(rec.status || '').toLowerCase()
      if (['cancelled', 'completed'].includes(status)) {
        cleaned++
        continue   // already done, no action needed
      }

      // Reject remaining pending_review / assigned records
      const reviewable = ['pending_review', 'assigned', 'in_progress', 'pending'].includes(status)
      if (reviewable) {
        await ctx.post(`${API_BASE}/admin/service-requests/${id}/review`, {
          data: { decision: 'reject', notes: 'E2E teardown — automated cleanup' },
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        cleaned++
      }
    }

    console.log(`[teardown] ✅ Cleaned ${cleaned}/${ids.length} seeded records`)
  } finally {
    await ctx.dispose()
    // Remove state file regardless of success
    try { fs.unlinkSync(STATE_FILE) } catch (_) {}
  }
}
