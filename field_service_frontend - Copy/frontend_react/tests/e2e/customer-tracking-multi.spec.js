/**
 * Multi-user SSE test — ensures no data leakage between customers.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loginViaApi, apiPost, TEST_ACCOUNTS } from './helpers.js'
import { create_test_technician, cleanup_test_data } from './test_data_helpers.js'
import {
  waitForE2eCustomerIsolation,
  waitForE2eLiveTracking,
  waitForE2eServiceRequest,
  waitForTechnicianProfile,
} from './sync_helpers.js'

const API_BASE = process.env.E2E_API_BASE || 'http://127.0.0.1:8000'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const STATE_FILE = path.join(__dirname, 'e2e-setup-state.json')

const ADMIN = TEST_ACCOUNTS.admin
const TECH = TEST_ACCOUNTS.technician
const CUST_A = TEST_ACCOUNTS.customer

async function loginToken(request, creds) {
  const res = await request.post(`${API_BASE}/auth/login`, { data: creds })
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`)
  }
  const json = await res.json()
  return { token: json.token || json.access_token, user: json.user }
}

async function signupCustomer(request, email, password) {
  const res = await request.post(`${API_BASE}/auth/signup`, {
  data: { name: 'Etwo Customer B', email, password, phone: '9000000022', role: 'customer' },
  })
  if (!res.ok()) {
    const body = await res.text()
    throw new Error(`Signup failed: ${res.status()} ${body}`)
  }
  const json = await res.json()
  return json.user
}

test.describe('Customer Live Tracking (Multi-user)', () => {
  test.setTimeout(120_000)

  test('Each customer sees only their own tracking', async ({ browser, request }) => {
    const testRunId = `playwright-${Date.now()}-${Math.random().toString(36).slice(2,8)}`

    const adminAuth = await loginToken(request, ADMIN)
    const techAuth = await loginToken(request, TECH)
    const custAAuth = await loginToken(request, CUST_A)

    const uniqueEmail = `e2e.customer.b+${Date.now()}@test.com`
    const custBUser = await signupCustomer(request, uniqueEmail, CUST_A.password)
    const custBAuth = await loginToken(request, { email: uniqueEmail, password: CUST_A.password })

    // create per-test technician to avoid consuming shared seeded jobs
    const tech = await create_test_technician(adminAuth.token, { test_run_id: testRunId, name: 'E2E-Tech-Multi' })
    const techId = tech.technician_id
    // link the shared technician account to the created technician so it can start jobs
    const techLogin = await request.post(`${API_BASE}/auth/login`, { data: TEST_ACCOUNTS.technician })
    const techJson = await techLogin.json()
    const techToken = techJson.token || techJson.access_token
    await request.post(`${API_BASE}/technician/link-profile`, {
      data: { technician_code: `E2E-${testRunId}-${techId}` },
      headers: { Authorization: `Bearer ${techToken}` },
    })
    // Wait until link-profile takes effect and technician profile resolves to the created id
    await waitForTechnicianProfile(request, techToken, techId, { timeout: 10_000 })

    const testRunIdA = `${testRunId}-A`
    const seedA = await apiPost(request, adminAuth.token, '/admin/test/seed', {
      pending_count: 1,
      technician_id: techId,
      customer_id: String(custAAuth.user?.id || ''),
      customer_email: custAAuth.user?.email || CUST_A.email,
      customer_name: custAAuth.user?.name || 'E2E Customer A',
      test_run_id: testRunIdA,
    })
    expect(seedA.status).toBe(200)
    const jobA = seedA.body?.assigned_job_id
    expect(jobA).toBeTruthy()
    await waitForE2eServiceRequest(request, adminAuth.token, testRunIdA, jobA, () => true, { timeout: 15_000 })

    const testRunIdB = `${testRunId}-B`
    const seedB = await apiPost(request, adminAuth.token, '/admin/test/seed', {
      pending_count: 1,
      technician_id: techId,
      customer_id: String(custBAuth.user?.id || ''),
      customer_email: custBAuth.user?.email || uniqueEmail,
      customer_name: custBAuth.user?.name || 'E2E Customer B',
      test_run_id: testRunIdB,
    })
    expect(seedB.status).toBe(200)
    const jobB = seedB.body?.assigned_job_id
    expect(jobB).toBeTruthy()
    await waitForE2eServiceRequest(request, adminAuth.token, testRunIdB, jobB, () => true, { timeout: 15_000 })

    const start = await apiPost(request, techAuth.token, `/technician/jobs/${jobA}/start`, {})
    expect(start.status).toBe(200)
    await waitForE2eServiceRequest(
      request,
      adminAuth.token,
      testRunIdA,
      jobA,
      (item) => String(item.status || '').toLowerCase() === 'in_progress',
      { timeout: 30_000 },
    )

    const contextA = await browser.newContext()
    const pageA = await contextA.newPage()
    await loginViaApi(pageA, CUST_A.email, CUST_A.password)
    await pageA.goto('/customer')
    await pageA.waitForLoadState('domcontentloaded')

    const rowA = pageA.locator('tr').filter({ hasText: String(jobA) }).first()
    await expect(rowA).toBeVisible({ timeout: 15_000 })
    await rowA.getByRole('button', { name: /view details/i }).click()

    const contextB = await browser.newContext()
    const pageB = await contextB.newPage()
    await loginViaApi(pageB, uniqueEmail, CUST_A.password)
    await pageB.goto('/customer')
    await pageB.waitForLoadState('domcontentloaded')

    const rowB = pageB.locator('tr').filter({ hasText: String(jobB) }).first()
    await expect(rowB).toBeVisible({ timeout: 15_000 })
    await rowB.getByRole('button', { name: /view details/i }).click()

    const liveResp = await apiPost(request, techAuth.token, `/technician/jobs/${jobA}/live-location`, {
      latitude: 10.8505,
      longitude: 76.2711,
      accuracy_m: 5,
      heading: 0,
      timestamp: new Date().toISOString(),
    })
    if (liveResp.status !== 200) {
      console.error('LIVE_POST_FAILED', liveResp)
    }
    expect(liveResp.status).toBe(200)
    expect(liveResp.body && liveResp.body.stored).toBeTruthy()

    await waitForE2eLiveTracking(request, adminAuth.token, testRunIdA, jobA, { timeout: 45_000 })

    await waitForE2eCustomerIsolation(
      request,
      adminAuth.token,
      [testRunIdA, testRunIdB],
      custAAuth.user?.id || CUST_A.email,
      custBAuth.user?.id || uniqueEmail,
      { timeout: 45_000 },
    )

    await expect(pageA.getByText(/technician is on the way/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(pageA.getByTestId('eta-value')).toContainText(/arriving in/i, { timeout: 15_000 })

    await expect(pageB.getByText(/technician will start shortly/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(pageB.getByTestId('tracking-map')).toHaveCount(0)

    await contextA.close()
    await contextB.close()

    // cleanup per-test data
    await cleanup_test_data(adminAuth.token, testRunId)
  })
})
