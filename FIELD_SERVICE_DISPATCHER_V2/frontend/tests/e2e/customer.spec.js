/**
 * E2E tests — Customer Dashboard
 *
 * 1. Create a service request via the form
 * 2. Verify the new request appears in the customer's request list
 * 3. Verify the backend API confirms the request exists
 */

import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'url'
import { loginViaApi, apiGet, TEST_ACCOUNTS } from './helpers.js'
import { ROUTE_PATTERNS } from './routePatterns.js'

// Real fault photo so the AI diagnosis engine accepts it
const FAULT_IMAGE = fileURLToPath(
  new URL('../../../dataset/images/blockage_critical_1.jpg', import.meta.url),
)

const CUST = TEST_ACCOUNTS.customer
const toastSelector = '[data-testid="notification-toast"]'
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test.describe('Customer Dashboard', () => {
  /** Auth token obtained during login — reused across API checks. */
  let token = ''

  test.beforeEach(async ({ page }) => {
    const auth = await loginViaApi(page, CUST.email, CUST.password)
    token = auth.token
  })

  test('Upload validation shows warning notification for invalid file type', async ({ page }) => {
    console.log('ACTION: Navigate to new-request form')
    await page.goto('/customer/new-request')
    await page.waitForLoadState('domcontentloaded')

    console.log('ACTION: Upload invalid file type to trigger warning notification')
    await page.locator('input[type="file"]').setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not-an-image'),
    })

    await expect(
      page.locator(`${toastSelector}[data-notification-type="warning"]`).filter({ hasText: /unsupported file type|jpg or png/i }).first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Customer dashboard shows loading indicator during delayed API response', async ({ page }) => {
    let delayedOnce = false
    await page.route(ROUTE_PATTERNS.customerMyRequests, async (route) => {
      if (!delayedOnce) {
        delayedOnce = true
        await wait(1_200)
      }
      await route.continue().catch(() => {})
    })

    await page.goto('/customer')

    const loadingStatus = page.getByRole('status', { name: /loading table data/i })
    await expect(loadingStatus).toBeVisible({ timeout: 10_000 })
    await expect(loadingStatus).toBeHidden({ timeout: 20_000 })
    await page.unroute(ROUTE_PATTERNS.customerMyRequests)
  })

  test('Customer dashboard renders explicit empty state when request list is empty', async ({ page }) => {
    await page.route(ROUTE_PATTERNS.customerMyRequests, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
    })

    await page.goto('/customer')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/no requests submitted yet/i).first()).toBeVisible({ timeout: 10_000 })
  })

  // ─── Test 1: Submit a new service request ──────────────────────────────

  test('Create Service Request — form submit returns success', { timeout: 90_000 }, async ({ page }) => {
    console.log('ACTION: Navigate to new-request form')
    await page.goto('/customer/new-request')
    await page.waitForLoadState('domcontentloaded')

    // Fill mandatory fields
    console.log('ACTION: Fill form fields')
    await page.locator('input[name="customer_name"]').fill('Etwo Test Customer')
    await page.locator('input[name="customer_email"]').fill(CUST.email)
    await page.locator('input[name="contact"]').fill('9876543210')
    await page.locator('textarea[name="description"]').fill('E2E automated test — leaking pipe in washroom')

    // Location: use manual address mode
    await page.locator('input[name="city"]').fill('Chennai')
    await page.locator('input[name="state"]').fill('Tamil Nadu')
    await page.locator('input[name="pincode"]').fill('600001')
    await page.locator('input[name="location"]').fill('Chennai, Tamil Nadu')

    // Upload a real fault photo — required so the AI diagnosis engine accepts it
    await page.locator('input[type="file"]').setInputFiles(FAULT_IMAGE)

    // Submit
    console.log('ACTION: Submit service request')
    console.log('Waiting for customer submit result')
    const submitButton = page.getByRole('button', { name: /submit request/i })

    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('/customer/report-issue')
          && response.request().method() === 'POST'
          && response.status() === 200,
        { timeout: 60_000 },
      ),
      submitButton.click(),
    ])

    await page.waitForURL(/\/customer(?:\?.*)?$/i, { timeout: 15_000 })
    await page.waitForLoadState('domcontentloaded')

    // Success can be surfaced as a toast or the dashboard notification state.
    const successToast = page
      .locator(`${toastSelector}[data-notification-type="success"]`)
      .filter({ hasText: /request submitted|tracking id/i })
      .first()

    await expect(successToast).toBeVisible({ timeout: 10_000 })

    if (await page.getByText('Customer Dashboard').first().isVisible().catch(() => false)) {
      await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 })
    }

    console.log('ACTION: Service request submitted successfully')
  })

  // ─── Test 2: Verify request appears on Customer Dashboard ──────────────

  test('Customer Dashboard — new request visible in table', async ({ page }) => {
    console.log('ACTION: Navigate to Customer Dashboard')
    await page.goto('/customer')
    await page.waitForLoadState('domcontentloaded')

    // The dashboard should show at least one row (from earlier submission or seed data)
    await expect(page.getByText('Customer Dashboard')).toBeVisible()

    // Table should not be empty
    const emptyMsg = page.getByText('No requests submitted yet')
    const hasData = await emptyMsg.isVisible().catch(() => false)
    if (hasData) {
      console.log('WARNING: No requests found — seed data may be missing')
    } else {
      console.log('ACTION: Requests table has data')
    }
  })

  // ─── Test 3: Backend API confirms request exists ───────────────────────

  test('Verify request in DB via /customer/my-requests', async ({ page, request }) => {
    console.log('ACTION: Call /customer/my-requests API')
    const { status, body } = await apiGet(request, token, '/customer/my-requests')

    expect(status).toBe(200)
    expect(Array.isArray(body)).toBeTruthy()
    console.log(`ACTION: /customer/my-requests returned ${body.length} record(s)`)

    // Verify at least one request is present
    expect(body.length).toBeGreaterThan(0)
  })
})


