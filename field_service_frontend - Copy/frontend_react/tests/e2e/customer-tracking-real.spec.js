/**
 * Real SSE integration test — Customer live tracking
 *
 * Uses real backend SSE without mocks.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loginViaApi, apiGet, apiPost, TEST_ACCOUNTS } from './helpers.js'
import { create_test_technician, cleanup_test_data } from './test_data_helpers.js'
import { waitForE2eLiveTracking, waitForE2eServiceRequest } from './sync_helpers.js'

const API_BASE = process.env.E2E_API_BASE || 'http://127.0.0.1:8000'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const STATE_FILE = path.join(__dirname, 'e2e-setup-state.json')

const ADMIN = TEST_ACCOUNTS.admin
const TECH = TEST_ACCOUNTS.technician
const CUST = TEST_ACCOUNTS.customer

async function loginToken(request, creds) {
  const res = await request.post(`${API_BASE}/auth/login`, { data: creds })
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`)
  }
  const json = await res.json()
  return { token: json.token || json.access_token, user: json.user }
}

test.describe('Customer Live Tracking (Real SSE)', () => {
  test.setTimeout(120_000)

  test('SSE updates ETA and map after start', async ({ page, request }) => {
    const testRunId = `playwright-${Date.now()}-${Math.random().toString(36).slice(2,8)}`

    const adminAuth = await loginToken(request, ADMIN)
    const techAuth = await loginToken(request, TECH)
    const custAuth = await loginToken(request, CUST)

    // Create a dedicated technician for this test to ensure isolation
    const tech = await create_test_technician(adminAuth.token, { test_run_id: testRunId, name: 'E2E-Tech-Real' })
    const techId = tech.technician_id
    // Link the shared technician account to the created technician
    const techLoginRes = await request.post(`${API_BASE}/auth/login`, { data: TEST_ACCOUNTS.technician })
    const techLoginJson = await techLoginRes.json()
    const techToken = techLoginJson.token || techLoginJson.access_token
    await request.post(`${API_BASE}/technician/link-profile`, {
      data: { technician_code: `E2E-${testRunId}-${techId}` },
      headers: { Authorization: `Bearer ${techToken}` },
    })

    const seed = await apiPost(request, adminAuth.token, '/admin/test/seed', {
      pending_count: 1,
      technician_id: techId,
      customer_id: String(custAuth.user?.id || ''),
      customer_email: custAuth.user?.email || CUST.email,
      customer_name: custAuth.user?.name || 'E2E Customer',
      test_run_id: testRunId,
    })
    expect(seed.status).toBe(200)
    const jobId = seed.body?.assigned_job_id
    expect(jobId).toBeTruthy()

    const startRes = await apiPost(request, techAuth.token, `/technician/jobs/${jobId}/start`, {})
    expect(startRes.status).toBe(200)

    await waitForE2eServiceRequest(
      request,
      adminAuth.token,
      testRunId,
      jobId,
      (item) => String(item.status || '').toLowerCase() === 'in_progress',
      { timeout: 45_000 },
    )

    await loginViaApi(page, CUST.email, CUST.password)
    await page.goto('/customer')
    await page.waitForLoadState('domcontentloaded')

    const row = page.locator('tr').filter({ hasText: String(jobId) }).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.getByRole('button', { name: /view details/i }).click()

    await expect(page.getByText(/technician is on the way/i).first()).toBeVisible({ timeout: 15_000 })

    await apiPost(request, techAuth.token, `/technician/jobs/${jobId}/live-location`, {
      latitude: 10.8505,
      longitude: 76.2711,
      accuracy_m: 5,
      heading: 0,
      timestamp: new Date().toISOString(),
    })

    await waitForE2eLiveTracking(request, adminAuth.token, testRunId, jobId, { timeout: 45_000 })

    await expect(page.getByTestId('eta-value')).toContainText(/arriving in/i, { timeout: 15_000 })
    // cleanup created test data for this run
    await cleanup_test_data(adminAuth.token, testRunId)
  })
})
