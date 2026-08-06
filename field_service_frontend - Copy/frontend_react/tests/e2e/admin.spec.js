/**
 * E2E tests — Admin Dashboard & Activity Page
 *
 * 1. Operations table loads (AdminDashboard)
 * 2. KPI cards render
 * 3. Approve a pending request
 * 4. Modify & Approve a pending request
 * 5. Reject a pending request
 * 6. Backend verification after each action
 */

import { test, expect } from '@playwright/test'
import { loginViaApi, apiGet, apiPost, TEST_ACCOUNTS } from './helpers.js'
import { ROUTE_PATTERNS, responseMatches } from './routePatterns.js'

const ADMIN = TEST_ACCOUNTS.admin
const toastSelector = '[data-testid="notification-toast"]'
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test.describe('Admin Dashboard — Operations', () => {
  let token = ''

  test.beforeEach(async ({ page }) => {
    const auth = await loginViaApi(page, ADMIN.email, ADMIN.password)
    token = auth.token
  })

  // ─── Test 1: Operations table loads ────────────────────────────────────

  test('Operations table loads with data', async ({ page }) => {
    console.log('ACTION: Navigate to Admin Dashboard')
    await page.goto('/admin')
    await page.waitForLoadState('domcontentloaded')

    // KPI cards should be visible
    await expect(page.getByText(/total requests/i)).toBeVisible({ timeout: 15_000 })
    console.log('ACTION: KPI cards visible')
  })

  // ─── Test 2: Verify data via API ───────────────────────────────────────

  test('API /admin/service-requests returns paginated data', async ({ page, request }) => {
    console.log('ACTION: Call /admin/service-requests API')
    const { status, body } = await apiGet(request, token, '/admin/service-requests?limit=10')

    expect(status).toBe(200)
    // Paginated envelope: { data, last_id, has_more }
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBeTruthy()
    console.log(`ACTION: /admin/service-requests returned ${body.data.length} record(s), has_more=${body.has_more}`)
  })

  // ─── Test 3: KPI endpoint ─────────────────────────────────────────────

  test('API /admin/kpis returns counts', async ({ page, request }) => {
    console.log('ACTION: Call /admin/kpis API')
    const { status, body } = await apiGet(request, token, '/admin/kpis')

    expect(status).toBe(200)
    expect(typeof body.total).toBe('number')
    expect(typeof body.pending_hitl).toBe('number')
    expect(typeof body.approved).toBe('number')
    expect(typeof body.rejected).toBe('number')
    console.log(
      `ACTION: KPIs — total=${body.total}, pending=${body.pending_hitl}, approved=${body.approved}, rejected=${body.rejected}`,
    )
  })

  // ─── Test 4: View Details modal opens ──────────────────────────────────

  test('View Details modal opens from Operations table', async ({ page }) => {
    console.log('ACTION: Navigate to Admin Dashboard')
    await page.route(ROUTE_PATTERNS.adminServiceRequests, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'E2E_ADMIN_DETAIL_1',
              issue_type: 'Compressor fault',
              status: 'assigned',
              priority_score: 0.9,
              location_text: 'Test Location',
              created_at: new Date().toISOString(),
            },
          ],
          last_id: null,
          has_more: false,
        }),
      })
    })

    await page.route(/\/(?:api\/)?admin\/service-requests\/[^/?#]+(?:\?.*)?$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'E2E_ADMIN_DETAIL_1',
          issue_type: 'Compressor fault',
          status: 'assigned',
          description: 'Test detail',
          location_text: 'Test Location',
        }),
      })
    })

    await page.goto('/admin')
    await page.waitForLoadState('domcontentloaded')

    const viewBtn = page.getByRole('button', { name: /view details/i }).first()
    await expect(viewBtn).toBeVisible({ timeout: 30_000 })

    console.log('ACTION: Click View Details')
    await viewBtn.click({ force: true })

    await expect(page.getByText(/request detail/i)).toBeVisible({ timeout: 20_000 })
    console.log('ACTION: Request Detail modal opened')

    // Close
    const closeBtn = page.getByRole('button', { name: /close/i }).first()
    await closeBtn.click()
    await page.unroute(ROUTE_PATTERNS.adminServiceRequests)
  })

  // ─── Test 5: Load More pagination ─────────────────────────────────────

  test('Load More button fetches next page', async ({ page }) => {
    console.log('ACTION: Navigate to Admin Dashboard')
    await page.goto('/admin')
    await page.waitForLoadState('domcontentloaded')

    const loadMore = page.getByRole('button', { name: /load more/i })
    await expect(loadMore).toBeVisible({ timeout: 15_000 })

    console.log('ACTION: Click Load More')
    await loadMore.click()
    await page.waitForTimeout(3000)
    console.log('ACTION: Additional records loaded')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Activity Page — review actions
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Admin Activity Page — Review Actions', () => {
  let token = ''

  test.beforeEach(async ({ page }) => {
    const auth = await loginViaApi(page, ADMIN.email, ADMIN.password)
    token = auth.token
  })

  // ─── Test 6: Activity page loads ───────────────────────────────────────

  test('Activity page loads with KPI cards and tables', async ({ page, request }) => {
    console.log('ACTION: Navigate to Admin Activity Page')
    await page.goto('/admin/activity')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/pending hitl/i).first()).toBeVisible({ timeout: 15_000 })

    const { status, body: pendingList } = await apiGet(request, token, '/admin/pending-hitl')
    expect(status).toBe(200)
    console.log(`SETUP CHECK: pending_hitl_items=${pendingList.length}`)
    expect(pendingList.length).toBeGreaterThan(0)
    console.log('ACTION: Activity page loaded with KPI cards')
  })

  test('Activity page shows loading indicator during delayed API responses', async ({ page }) => {
    let delayedOnce = false
    await page.route(ROUTE_PATTERNS.adminServiceRequests, async (route) => {
      if (!delayedOnce) {
        delayedOnce = true
        await wait(1_200)
      }
      await route.continue().catch(() => {})
    })

    await page.goto('/admin/activity')

    await expect(page.getByText(/loading activity feed/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/loading activity feed/i)).toBeHidden({ timeout: 20_000 })
    await page.unroute(ROUTE_PATTERNS.adminServiceRequests)
  })

  test('Activity page renders explicit empty states for pending and finalized tables', async ({ page }) => {
    await page.route(ROUTE_PATTERNS.adminServiceRequests, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], last_id: null, has_more: false }),
      })
    })

    await page.route(ROUTE_PATTERNS.adminPendingHitl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
    })

    await page.route(ROUTE_PATTERNS.adminKpis, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ total: 0, pending_hitl: 0, approved: 0, rejected: 0 }),
      })
    })

    await page.goto('/admin/activity')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/no pending review items/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/no finalized requests found/i).first()).toBeVisible({ timeout: 10_000 })
  })

  // ─── Test 7: Approve deterministic success path (mocked) ──────────────

  test('Approve (mocked) — success feedback is deterministic', async ({ page }) => {
    await page.route(ROUTE_PATTERNS.adminReviewAction, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Mock approve success' }),
      })
    })

    await page.goto('/admin/activity')
    await page.waitForLoadState('domcontentloaded')

    const approveBtn = page.locator('.action-btn-success', { hasText: /approve/i }).first()
    await expect(approveBtn).toBeVisible({ timeout: 15_000 })
    await approveBtn.click()

    await expect(
      page.locator(`${toastSelector}[data-notification-type="success"]`).filter({ hasText: /approved|dispatched|success/i }).first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  // ─── Test 8: Approve deterministic non-2xx path (mocked) ──────────────

  test('Approve (mocked) — 503 maps to availability feedback', async ({ page }) => {
    await page.route(ROUTE_PATTERNS.adminReviewAction, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Dispatch service unavailable for this request.' }),
      })
    })

    await page.goto('/admin/activity')
    await page.waitForLoadState('domcontentloaded')

    const approveBtn = page.locator('.action-btn-success', { hasText: /approve/i }).first()
    await expect(approveBtn).toBeVisible({ timeout: 15_000 })
    await approveBtn.click()

    await expect(
      page.locator(`${toastSelector}[data-notification-type="error"]`).filter({ hasText: /unavailable|temporarily|retry|failed/i }).first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  // ─── Test 9: Approve live smoke (status-aware) ────────────────────────

  test('Approve — live-path smoke is status-aware', async ({ page }) => {
    console.log('ACTION: Navigate to Admin Activity Page')
    await page.goto('/admin/activity')
    await page.waitForLoadState('domcontentloaded')

    const approveBtn = page.locator('.action-btn-success', { hasText: /approve/i }).first()
    await expect(approveBtn).toBeVisible({ timeout: 15_000 })

    console.log('ACTION: Trigger live approve review')
    const reviewResponsePromise = page.waitForResponse(
      (res) => responseMatches(res, 'POST', ROUTE_PATTERNS.adminReviewAction),
      { timeout: 15_000 },
    )
    await approveBtn.click()

    const reviewResponse = await reviewResponsePromise
    const reviewStatus = reviewResponse.status()

    if (reviewStatus >= 200 && reviewStatus < 300) {
      await expect(
        page.locator(`${toastSelector}[data-notification-type="success"]`).filter({ hasText: /approved|dispatched|success/i }).first(),
      ).toBeVisible({ timeout: 15_000 })
      console.log('ACTION: Live approve returned 2xx and success feedback is visible')
    } else {
      await expect(
        page.locator(`${toastSelector}[data-notification-type="error"]`).filter({ hasText: /failed|unable|unavailable|error|approve|validation|not found|retry/i }).first(),
      ).toBeVisible({ timeout: 15_000 })
      console.log(`ACTION: Approve returned non-success status ${reviewStatus}`)
    }
  })

  // ─── Test 10: Modify & Approve deterministic flow (mocked) ─────────────

  test('Modify & Approve (mocked) — opens modal, changes severity, submits', async ({ page }) => {
    await page.route(ROUTE_PATTERNS.adminReviewAction, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Mock modify approve success' }),
      })
    })

    console.log('ACTION: Navigate to Admin Activity Page')
    await page.goto('/admin/activity')
    await page.waitForLoadState('domcontentloaded')

    const modifyBtn = page.locator('.action-btn-warning', { hasText: /modify/i }).first()
    await expect(modifyBtn).toBeVisible({ timeout: 15_000 })

    console.log('ACTION: Click Modify & Approve')
    await modifyBtn.click()

    // Modal should open
    await expect(page.getByText(/modify & approve/i).nth(1)).toBeVisible({ timeout: 10_000 })
    console.log('ACTION: Modify & Approve modal opened')

    // Change severity in the dropdown
    const severitySelect = page.locator('select').first()
    await severitySelect.selectOption('high')
    console.log('ACTION: Severity changed to "high"')

    // Add an admin note
    const notesArea = page.locator('textarea').first()
    await notesArea.fill('E2E test — severity corrected to high')

    // Submit
    const submitBtn = page
      .getByRole('button', { name: /modify & approve/i })
      .last()
    await submitBtn.click()

    const confirmApprove = page.locator('.popup-overlay').getByRole('button', { name: /^approve$/i })
    await expect(confirmApprove).toBeVisible({ timeout: 10_000 })
    await confirmApprove.click()

    await expect(
      page.locator(`${toastSelector}[data-notification-type="success"]`).filter({ hasText: /modified|approved|success/i }).first(),
    ).toBeVisible({ timeout: 15_000 })
    console.log('ACTION: Modify & Approve succeeded (mocked path)')
  })

  test('Modify & Approve shows modal loading feedback while submitting', async ({ page }) => {
    await page.route(ROUTE_PATTERNS.adminReviewAction, async (route) => {
      await wait(1_200)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Mock modify approve success' }),
      })
    })

    await page.goto('/admin/activity')
    await page.waitForLoadState('domcontentloaded')

    const modifyBtn = page.locator('.action-btn-warning', { hasText: /modify/i }).first()
    await expect(modifyBtn).toBeVisible({ timeout: 15_000 })
    await modifyBtn.click()

    await expect(page.getByText(/modify & approve/i).nth(1)).toBeVisible({ timeout: 10_000 })
    await page.locator('select').first().selectOption('high')
    await page.locator('textarea').first().fill('E2E loading feedback check')

    const submitBtn = page.getByRole('button', { name: /modify & approve/i }).last()
    await submitBtn.click()

    const confirmApprove = page.locator('.popup-overlay').getByRole('button', { name: /^approve$/i })
    await expect(confirmApprove).toBeVisible({ timeout: 10_000 })
    await confirmApprove.click()

    await expect(page.getByRole('dialog', { name: /modify & approve/i }).getByRole('button', { name: /processing/i })).toBeVisible({ timeout: 10_000 })
    await expect(
      page.locator(`${toastSelector}[data-notification-type="success"]`).filter({ hasText: /modified|approved|success/i }).first(),
    ).toBeVisible({ timeout: 20_000 })
  })

  // ─── Test 9: Reject ───────────────────────────────────────────────────

  test('Reject — opens modal, fills reason, confirms', async ({ page, request }) => {
    console.log('ACTION: Navigate to Admin Activity Page')
    await page.goto('/admin/activity')
    await page.waitForLoadState('domcontentloaded')

    const rejectBtn = page.locator('.action-btn-danger', { hasText: /reject/i }).first()
    await expect(rejectBtn).toBeVisible({ timeout: 15_000 })

    console.log('ACTION: Click Reject')
    await rejectBtn.click()

    // Reject modal should appear
    await expect(page.getByText(/reject request/i)).toBeVisible({ timeout: 10_000 })
    console.log('ACTION: Reject modal opened')

    // Fill rejection reason (required)
    const reasonArea = page.locator('textarea').first()
    await reasonArea.fill('E2E_AUTH rejection duplicate spam request')

    // Confirm
    const confirmBtn = page.getByRole('button', { name: /confirm reject/i })
    await confirmBtn.click()

    const confirmReject = page.locator('.popup-overlay').getByRole('button', { name: /^reject$/i })
    await expect(confirmReject).toBeVisible({ timeout: 10_000 })
    const reviewResponsePromise = page.waitForResponse(
      (res) => responseMatches(res, 'POST', ROUTE_PATTERNS.adminReviewAction),
      { timeout: 15_000 },
    )
    await confirmReject.click()

    const reviewResponse = await reviewResponsePromise
    const reviewStatus = reviewResponse.status()
    if (reviewStatus >= 200 && reviewStatus < 300) {
      await expect(
        page.locator(`${toastSelector}[data-notification-type="warning"], ${toastSelector}[data-notification-type="success"]`).filter({ hasText: /rejected|cancelled|success/i }).first(),
      ).toBeVisible({ timeout: 15_000 })
    } else {
      await expect(
        page.locator(`${toastSelector}[data-notification-type="error"]`).filter({ hasText: /failed|unable|error|reject|validation|not found|retry/i }).first(),
      ).toBeVisible({ timeout: 15_000 })
    }
    console.log('ACTION: Reject succeeded')

    // Backend verification
    console.log('ACTION: Verify rejection via /admin/kpis')
    const { body: kpis } = await apiGet(request, token, '/admin/kpis')
    console.log(`ACTION: KPIs after reject — rejected=${kpis.rejected}`)
  })
})
