/**
 * E2E test — Customer live tracking
 *
 * Validates that a started job shows live tracking status,
 * map visibility, and ETA in the customer modal.
 */

import { test, expect } from '@playwright/test'
import { loginViaApi, TEST_ACCOUNTS } from './helpers.js'
import { ROUTE_PATTERNS } from './routePatterns.js'

const TECH = TEST_ACCOUNTS.technician
const CUST = TEST_ACCOUNTS.customer

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test.describe('Customer Live Tracking', () => {
  test('Live tracking shows status, map, and ETA after start', async ({ page }) => {
    const requestId = 'E2E_TRACK_1'
    const now = new Date().toISOString()
    let started = false

    await loginViaApi(page, TECH.email, TECH.password)

    await page.route(ROUTE_PATTERNS.technicianJobs, async (route) => {
      const status = started ? 'in_progress' : 'assigned'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [
            {
              id: requestId,
              status,
              fault_type: 'Compressor issue',
              severity: 'medium',
              latitude: 13.0827,
              longitude: 80.2707,
              is_locked: started,
            },
          ],
          completed_jobs: [],
        }),
      })
    })

    await page.route(ROUTE_PATTERNS.jobsStartAction, async (route) => {
      started = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Job started' }),
      })
    })

    await page.goto('/technician')
    await page.waitForLoadState('domcontentloaded')

    const startBtn = page.getByRole('button', { name: /start job/i }).first()
    await expect(startBtn).toBeVisible({ timeout: 10_000 })
    await startBtn.click()
    await expect(page.getByRole('button', { name: /mark complete/i }).first()).toBeVisible({ timeout: 10_000 })

    await loginViaApi(page, CUST.email, CUST.password)

    const requestPayload = {
      id: requestId,
      fault_type: 'Compressor issue',
      severity: 'medium',
      status: 'in_progress',
      location_text: 'Chennai, Tamil Nadu',
      latitude: 13.0827,
      longitude: 80.2707,
      assigned_technician_name: 'E2E Tech',
      assigned_technician_phone_number: '9000000001',
      created_at: now,
      assigned_at: now,
    }

    await page.route(ROUTE_PATTERNS.customerMyRequests, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([requestPayload]),
      })
    })

    await page.route(/\/(?:api\/)?customer\/my-requests\/E2E_TRACK_1(?:\?.*)?$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(requestPayload),
      })
    })

    await page.route(/\/(?:api\/)?customer\/my-requests\/E2E_TRACK_1\/image(?:\?.*)?$/i, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Image not found' }),
      })
    })

    await page.route(/\/(?:api\/)?customer\/jobs\/E2E_TRACK_1\/live(?:\?.*)?$/i, async (route) => {
      const payload = {
        job_id: requestId,
        status: 'in_progress',
        technician_location: { lat: 13.0831, lng: 80.2714 },
        customer_location: { lat: 13.0827, lng: 80.2707 },
        eta_minutes: 12,
        distance_km: 2.5,
        updated_at: now,
      }
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: `event: status\ndata: ${JSON.stringify(payload)}\n\n`,
      })
    })

    await page.goto('/customer')
    await page.waitForLoadState('domcontentloaded')

    const viewBtn = page.getByRole('button', { name: /view details/i }).first()
    await expect(viewBtn).toBeVisible({ timeout: 10_000 })
    await viewBtn.click()

    await expect(page.getByText(/technician is on the way/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('tracking-map')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('eta-value')).toBeVisible({ timeout: 10_000 })

    await wait(500)
    await page.unroute(ROUTE_PATTERNS.technicianJobs)
    await page.unroute(ROUTE_PATTERNS.jobsStartAction)
    await page.unroute(ROUTE_PATTERNS.customerMyRequests)
    await page.unroute(/\/(?:api\/)?customer\/my-requests\/E2E_TRACK_1(?:\?.*)?$/i)
    await page.unroute(/\/(?:api\/)?customer\/my-requests\/E2E_TRACK_1\/image(?:\?.*)?$/i)
    await page.unroute(/\/(?:api\/)?customer\/jobs\/E2E_TRACK_1\/live(?:\?.*)?$/i)
  })
})
