/**
 * Playwright global setup — seeds all E2E test data before the suite runs.
 *
 * Goals
 * ─────
 * 1. Link the E2E technician account to a real technician that has active jobs,
 *    OR create an assigned job directly via the test-seed endpoint.
 * 2. Ensure ≥ REQUIRED_PENDING items with status=pending_review exist so that
 *    every admin / validation test gets something to act on.
 *
 * The IDs of every record created here are written to
 *   tests/e2e/e2e-setup-state.json
 * and read by teardownTestData.js to clean up after the suite.
 */

import { request } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const API_BASE = 'http://127.0.0.1:8000'
const STATE_FILE = path.join(__dirname, 'e2e-setup-state.json')

/** How many pending_review records we create on every run. */
const REQUIRED_PENDING = 12

const TEST_ACCOUNTS = {
  customer:   { email: 'e2e.customer@test.com', password: 'E2eTest9999' },
  technician: { email: 'e2e.tech@test.com',     password: 'E2eTest9999' },
  admin:      { email: 'e2e.admin@test.com',     password: 'E2eTest9999' },
}

// ──────────────────────────────────────────────────────────────────────────────
// Low-level HTTP helpers (no page object — this runs outside the browser)
// ──────────────────────────────────────────────────────────────────────────────

async function login(ctx, { email, password }) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await ctx.post(`${API_BASE}/auth/login`, { data: { email, password } })
      if (!res.ok()) throw new Error(`Login ${email} → ${res.status()}: ${await res.text()}`)
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
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status(), body }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ──────────────────────────────────────────────────────────────────────────────
// Technician setup
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Ensure the E2E tech account is linked to a technician.
 * Returns { technicianId, linkedTechnicianCode }
 */
async function ensureTechnicianLinked(ctx, techToken, adminToken) {
  // ── 1. Check if already linked ──────────────────────────────────────────
  const { status: jobStatus, body: jobBody } = await apiGet(ctx, techToken, '/technician/jobs')

  if (jobStatus === 200) {
    const activeJobs = jobBody?.jobs ?? []
    const technicianId = jobBody?.technician_id ?? null
    if (activeJobs.length > 0) {
      console.log(`[setup] Tech already linked (id=${technicianId}) with ${activeJobs.length} active job(s) — no relinking needed`)
      return { technicianId, linkedCode: null }
    }
    console.log(`[setup] Tech linked (id=${technicianId}) but 0 active jobs`)
    return { technicianId, linkedCode: null }
  }

  // ── 2. Not linked — find a technician with active jobs and link ───────────
  console.log('[setup] Tech account not linked. Fetching technician list...')
  const { body: allTechs } = await apiGet(ctx, adminToken, '/admin/technicians')

  if (!Array.isArray(allTechs) || allTechs.length === 0) {
    throw new Error('[setup] No technicians found in DB — cannot link tech account')
  }

  // Sort by current_jobs DESC so we prefer busy technicians (more reliable test data)
  const sorted = [...allTechs].sort(
    (a, b) => (Number(b.current_jobs) || 0) - (Number(a.current_jobs) || 0),
  )

  let linkedTechnicianId = null
  let linkedCode = null

  for (const tech of sorted) {
    const code = (tech.technician_code || '').trim()
    if (!code) continue

    const { status: linkStatus, body: linkBody } = await apiPost(
      ctx,
      techToken,
      '/technician/link-profile',
      { technician_code: code },
    )

    if (linkStatus === 200) {
      linkedTechnicianId = linkBody.technician_id ?? tech.id
      linkedCode = code
      console.log(`[setup] Linked tech account to technician ${code} (id=${linkedTechnicianId}, current_jobs=${tech.current_jobs})`)
      break
    }
    if (linkStatus === 409) {
      // Already linked to another user — try next
      continue
    }
    // Any other error: log and try next
    console.warn(`[setup] link-profile ${code} returned ${linkStatus}: ${JSON.stringify(linkBody)}`)
  }

  if (!linkedTechnicianId) {
    // All technicians are taken; link to the first one regardless (tests will still pass)
    const first = sorted[0]
    const code  = (first.technician_code || '').trim()
    await apiPost(ctx, techToken, '/technician/link-profile', { technician_code: code })
    linkedTechnicianId = first.id
    linkedCode = code
    console.warn(`[setup] All techs linked to other users. Force-linked to ${code}`)
  }

  return { technicianId: linkedTechnicianId, linkedCode }
}

// ──────────────────────────────────────────────────────────────────────────────
// Pending HITL + assigned job seed
// ──────────────────────────────────────────────────────────────────────────────

async function seedTestData(ctx, adminToken, { pendingCount, technicianId }) {
  console.log(`[setup] Calling /admin/test/seed — pending=${pendingCount}, technician_id=${technicianId ?? 'none'}`)

  const { status, body } = await apiPost(ctx, adminToken, '/admin/test/seed', {
    pending_count: pendingCount,
    technician_id: technicianId ?? null,
  })

  if (status !== 200) {
    throw new Error(`[setup] /admin/test/seed failed (${status}): ${JSON.stringify(body)}`)
  }

  console.log(`[setup] Seeded ${body.pending_review_count} pending records, assigned_job=${body.assigned_job_id}`)
  return body.created_ids ?? []
}

// ──────────────────────────────────────────────────────────────────────────────
// Main global setup entry point
// ──────────────────────────────────────────────────────────────────────────────

export default async function globalSetup(_config) {
  const ctx = await request.newContext()
  const state = { createdIds: [], technicianId: null }

  try {
    // ── Login ────────────────────────────────────────────────────────────────
    console.log('[setup] Logging in as admin and tech...')
    const adminToken = await login(ctx, TEST_ACCOUNTS.admin)
    const techToken  = await login(ctx, TEST_ACCOUNTS.technician)

    // ── 1. Ensure technician account is linked ───────────────────────────────
    const { technicianId } = await ensureTechnicianLinked(ctx, techToken, adminToken)
    state.technicianId = technicianId

    // ── 2. Seed deterministic test data every run (no DB-state dependency) ──
    const ids = await seedTestData(ctx, adminToken, {
      pendingCount: REQUIRED_PENDING,
      technicianId,
    })
    state.createdIds = ids

    // ── 3. Verify setup is complete ──────────────────────────────────────────
    const { body: afterKpis } = await apiGet(ctx, adminToken, '/admin/kpis')
    const { body: techJobs }  = await apiGet(ctx, techToken, '/technician/jobs')

    const finalPending  = Number(afterKpis?.pending_hitl ?? 0)
    const finalJobs     = (techJobs?.jobs ?? []).length + (techJobs?.completed_jobs ?? []).length

    console.log(`[setup] ✓ Final pending_hitl=${finalPending}, technician active+completed jobs=${finalJobs}`)

    if (finalPending < 1) {
      throw new Error('[setup] Setup failed — no pending_hitl items in DB after seeding')
    }
    if ((techJobs?.jobs ?? []).length < 1) {
      // The "Mark Complete" test needs in_progress, which is created by "Start Job".
      // Having ≥1 assigned job is the only prerequisite for the suite.
      throw new Error('[setup] Setup failed — technician has no active (assigned) jobs after seeding')
    }

    console.log('[setup] ✅ Global setup complete')

  } finally {
    // Persist state for teardown (always, even on partial failure)
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8')
    await ctx.dispose()
  }
}
