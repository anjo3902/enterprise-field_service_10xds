import { test, expect } from '@playwright/test'
import { loginViaApi, apiGet, TEST_ACCOUNTS } from './helpers.js'

test.setTimeout(120_000)

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('cleanup timeout')), ms))

// Final safety guard: detect leftover scoped E2E records and fail the suite.
// Criteria:
//   - created within last 2 hours
//   - review_notes contains one of E2E_PREVISIT / E2E_REPORT / E2E_AUTH
//   - record has test marker (is_test_data / e2e_test_record / test_run_id)
//   - status is cancelled
//   - record is not assigned to a technician

test('E2E cleanup check — no remaining test records', async ({ page, request }) => {
  const auth = await loginViaApi(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password)
  const token = auth.token

  const found = []
  let lastId = null
  const cutoff = Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
  
  while (true) {
  const path = lastId ? `/admin/service-requests?limit=200&last_id=${lastId}` : '/admin/service-requests?limit=200'
  const respPromise = apiGet(request, token, path, { timeout: 10_000 })
  const { status, body } = await Promise.race([respPromise, timeout(10_000)])
  expect(status).toBe(200)

    const items = Array.isArray(body.data) ? body.data : (Array.isArray(body) ? body : [])
    
    for (const r of items) {
      const createdAt = r.created_at ? Date.parse(r.created_at) : null
      if (!createdAt || createdAt < cutoff) continue // only consider records from last 2 hours

      const reviewNotes = String(r.review_notes || '').toUpperCase()
      const hasScopedMarker = ['E2E_PREVISIT', 'E2E_REPORT', 'E2E_AUTH'].some((marker) => reviewNotes.includes(marker))
      const hasTestMarker = r.is_test_data === true || r.e2e_test_record === true || !!r.test_run_id
      const isCancelled = String(r.status || '').toLowerCase() === 'cancelled'
      const assignedTech = r.assigned_technician ?? r.assigned_technician_id ?? null
      const isUnassigned = assignedTech === null || assignedTech === undefined || String(assignedTech).trim() === ''

      if (hasScopedMarker && hasTestMarker && isCancelled && isUnassigned) {
        found.push({
          id: r.id || r.request_id || r._id,
          created_at: r.created_at,
          status: r.status,
          assigned_technician: assignedTech,
          review_notes: r.review_notes,
        })
      }
    }

    if (!body.has_more) break
    lastId = body.last_id
  }

  // Ensure the page/network has quiesced before final assertions to avoid races
  await page.waitForLoadState('domcontentloaded')
  console.log(`E2E cleanup check — found ${found.length} matching record(s)`)
  if (found.length > 0) {
    console.table(found)
  }

  expect(found.length, 'E2E/Playwright test records must be cleaned up after test run').toBe(0)
})
