import { test, expect } from '@playwright/test'
import { loginViaApi, apiGet, apiPost, TEST_ACCOUNTS } from './helpers.js'
import {
  create_test_technician,
  create_test_request,
  create_reassignment_scenario,
  cleanup_test_data,
} from './test_data_helpers.js'
import captureFailureDiagnostics from './failure_diagnostics.js'
import {
  waitForReassignmentRequested,
  waitForReassignmentProcessed,
  waitForRouteContainsRequest,
  waitForTechnicianJobsContain,
} from './sync_helpers.js'

const API_BASE = process.env.E2E_API_BASE || 'http://127.0.0.1:8000'

test.describe('Technician reassignment E2E', () => {
  test.setTimeout(120_000)

  let TEST_RUN_ID = null
  let adminToken = null
  let technicianToken = null
  let createdTechId = null
  let createdRequestId = null
  test.beforeEach(async ({ request }) => {
    // per-test unique run id
    TEST_RUN_ID = `playwright-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    // Admin login
    const adminRes = await request.post(`${API_BASE}/auth/login`, { data: TEST_ACCOUNTS.admin })
    expect(adminRes.ok()).toBeTruthy()
    const adminBody = await adminRes.json()
    adminToken = adminBody.token || adminBody.access_token

    // Create a dedicated E2E technician and a request assigned to them
    const tech = await create_test_technician(adminToken, { test_run_id: TEST_RUN_ID })
    createdTechId = tech.technician_id
    const req = await create_test_request(adminToken, { test_run_id: TEST_RUN_ID, assigned_technician: createdTechId })
    createdRequestId = req.request_id

    // Login as technician account (the test user), then link to created technician code
    const techLogin = await request.post(`${API_BASE}/auth/login`, { data: TEST_ACCOUNTS.technician })
    expect(techLogin.ok()).toBeTruthy()
    const techBody = await techLogin.json()
    technicianToken = techBody.token || techBody.access_token

    const techCode = `E2E-${TEST_RUN_ID}-${createdTechId}`
    const linkRes = await request.post(`${API_BASE}/technician/link-profile`, {
      data: { technician_code: techCode },
      headers: { Authorization: `Bearer ${technicianToken}` },
    })
    // linking may return 200
    expect(linkRes.ok()).toBeTruthy()
  })

  test.afterEach(async ({ request }) => {
    // Ensure cleanup runs even if tests failed
    try {
      await cleanup_test_data(adminToken, TEST_RUN_ID)
    } catch (e) {
      console.error('E2E cleanup failed', e)
    }
  })

  test('end-to-end reassignment flow', async ({ page, request }) => {
    // Instrumentation: collect console errors and failed requests
    const consoleLogs = []
    const failedRequests = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleLogs.push(`${msg.type()}: ${msg.text()}`)
    })
    page.on('requestfailed', (req) => {
      failedRequests.push({ url: req.url(), method: req.method(), failure: req.failure()?.errorText })
    })

    try {
      // Login to the app as the technician (fresh login picks up linked technician)
      await loginViaApi(page, TEST_ACCOUNTS.technician.email, TEST_ACCOUNTS.technician.password)

      // Open technician dashboard
      await page.goto('/technician')
      await page.waitForLoadState('domcontentloaded')

      // Locate the job card for our created request and click Request Reassignment
      await page.waitForSelector(`[data-testid="job-card"][data-job-id="${createdRequestId}"]`, { timeout: 30_000 })
      const jobRow = page.locator(`[data-testid="job-card"][data-job-id="${createdRequestId}"]`).first()
      await expect(jobRow).toBeVisible()

      const reassignBtn = jobRow.getByRole('button', { name: 'Request Reassignment' })
      await expect(reassignBtn).toBeVisible()
      await reassignBtn.scrollIntoViewIfNeeded()
      await reassignBtn.click()

      // Modal should open — select a reason and submit
      await page.waitForSelector('text=Request Reassignment', { timeout: 10000 })
      const modal = page.locator('div[class*="fixed"]:has-text("Request Reassignment")').first()
      await expect(modal).toBeVisible()

      // Phase 1 UI validations
      const select = modal.locator('select')
      await expect(select).toBeVisible()
      await select.selectOption('emergency_unavailable')

      const submitBtn = modal.getByRole('button', { name: 'Request Reassignment' })
      await expect(submitBtn).toBeEnabled()
      await submitBtn.click()

      // Success notification should appear
      await expect(page.locator('text=Reassignment Requested')).toBeVisible()

      // Phase 2: Firestore validation — the service request should be marked as reassignment_requested
      await waitForReassignmentRequested(request, adminToken, createdRequestId, { timeout: 30_000, testRunId: TEST_RUN_ID })

      // Phase 3: Wait for reassignment workflow to complete (processed/failed) and for assignment propagation
      await waitForReassignmentProcessed(request, adminToken, createdRequestId, createdTechId, { timeout: 120_000, testRunId: TEST_RUN_ID })

      // Verify route/technician propagation
      const { status: postStatus, body: postBody } = await apiGet(request, adminToken, `/admin/service-requests/${createdRequestId}`)
      expect(postStatus).toBe(200)
      const newTechId = postBody.assigned_technician
      if (newTechId && String(newTechId) !== String(createdTechId)) {
        await waitForRouteContainsRequest(request, adminToken, newTechId, createdRequestId, { timeout: 30_000, testRunId: TEST_RUN_ID })
        await waitForTechnicianJobsContain(request, adminToken, newTechId, createdRequestId, { timeout: 30_000, testRunId: TEST_RUN_ID })
      }
    } catch (err) {
      // On failure, capture diagnostics then rethrow
      try {
        await captureFailureDiagnostics({
          page,
          request,
          adminToken,
          testName: 'reassignment.spec',
          testRunId: TEST_RUN_ID,
          createdRequestId,
          createdTechId,
          collectedConsole: consoleLogs,
          collectedFailedRequests: failedRequests,
        })
      } catch (e) {
        console.error('Failed to capture diagnostics', e)
      }
      throw err
    }
  })
})
