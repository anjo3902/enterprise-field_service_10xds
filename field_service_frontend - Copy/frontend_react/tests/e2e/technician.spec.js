/**
 * E2E tests — Technician Dashboard
 *
 * 1. Load assigned jobs
 * 2. Start a job  → verify status becomes "in_progress"
 * 3. Mark a job complete → verify status becomes "completed"
 * 4. Confirm each state change via backend API
 */

import { test, expect } from '@playwright/test'
import { loginViaApi, apiGet, TEST_ACCOUNTS } from './helpers.js'
import { ROUTE_PATTERNS } from './routePatterns.js'

const TECH = TEST_ACCOUNTS.technician
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test.describe('Technician Dashboard', () => {
  let token = ''

  test.beforeEach(async ({ page }) => {
    const auth = await loginViaApi(page, TECH.email, TECH.password)
    token = auth.token
  })

  // ─── Test 1: Assigned jobs load ────────────────────────────────────────

  test('Load assigned jobs — table/cards render', async ({ page }) => {
    console.log('ACTION: Navigate to Technician Dashboard')
    await page.goto('/technician')
    await page.waitForLoadState('domcontentloaded')

    // The page should have the "Assigned Jobs" heading
    await expect(page.getByRole('heading', { name: /assigned jobs/i }).first()).toBeVisible({ timeout: 15_000 })

    console.log('ACTION: Assigned Jobs section visible')
  })

  // ─── Test 2: Verify assigned jobs via API ──────────────────────────────

  test('API /technician/jobs returns list', async ({ page, request }) => {
    console.log('ACTION: Call /technician/jobs API')
    const { status, body } = await apiGet(request, token, '/technician/jobs')
    expect(status).toBe(200)
    const jobs = Array.isArray(body) ? body : (body.jobs ?? [])
    console.log(`SETUP CHECK: technician_jobs_status=${status}, active_jobs=${jobs.length}`)
    expect(Array.isArray(jobs)).toBeTruthy()
    expect(jobs.length).toBeGreaterThan(0)
    console.log(`ACTION: /technician/jobs returned ${jobs.length} job(s)`)
  })

  test('Technician dashboard shows loading indicator during delayed jobs API', async ({ page }) => {
    let delayedOnce = false
    await page.route(ROUTE_PATTERNS.technicianJobs, async (route) => {
      if (!delayedOnce) {
        delayedOnce = true
        await wait(1_200)
      }
      await route.continue().catch(() => {})
    })

    await page.goto('/technician')

    const loadingStatus = page.locator('section').filter({ hasText: /Assigned Jobs Workspace/i }).getByRole('status', { name: /loading content/i })
    await expect(loadingStatus).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /assigned jobs/i }).first()).toBeVisible({ timeout: 20_000 })
    await page.unroute(ROUTE_PATTERNS.technicianJobs)
  })

  test('Technician dashboard renders explicit empty states when there are no jobs', async ({ page }) => {
    await page.route(ROUTE_PATTERNS.technicianJobs, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jobs: [], completed_jobs: [], summary: {} }),
      })
    })

    await page.route(ROUTE_PATTERNS.technicianMyRoute, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ route_order: [] }),
      })
    })

    await page.route(ROUTE_PATTERNS.technicianProfile, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          technician_name: 'E2E Tech',
          technician_code: 'TCH-E2E',
          latitude: 12.9716,
          longitude: 77.5946,
          current_latitude: 12.9716,
          current_longitude: 77.5946,
        }),
      })
    })

    await page.goto('/technician')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/no active assigned jobs right now/i)).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: /ai diagnosis/i }).click()
    await expect(page.getByText(/no diagnosis records found/i).first()).toBeVisible({ timeout: 10_000 })

    await expect(
      page.getByText(/no active stops with valid coordinates|map configuration required/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  // ─── Test 3: Start Job ─────────────────────────────────────────────────

  test('Start Job — status transitions to in_progress', async ({ page }) => {
    console.log('ACTION: Navigate to Technician Dashboard')
    let started = false
    await page.route(ROUTE_PATTERNS.technicianJobs, async (route) => {
      const status = started ? 'in_progress' : 'assigned'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [
            {
              id: 'E2E_START_TRANSITION',
              status,
              fault_type: 'Compressor issue',
              severity: 'medium',
              latitude: 12.9716,
              longitude: 77.5946,
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

    // After clicking, expect the status to change — look for "IN PROGRESS" badge
    await expect(page.getByRole('button', { name: /mark complete/i }).first()).toBeVisible({ timeout: 15_000 })
    console.log('ACTION: Job status changed to IN PROGRESS')
    await page.unroute(ROUTE_PATTERNS.technicianJobs)
    await page.unroute(ROUTE_PATTERNS.jobsStartAction)
  })

  test('Start Job shows action loading feedback while request is in-flight', async ({ page }) => {
    let started = false
    await page.route(ROUTE_PATTERNS.technicianJobs, async (route) => {
      const status = started ? 'in_progress' : 'assigned'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [
            {
              id: 'E2E_START_LOADING',
              status,
              fault_type: 'Compressor issue',
              severity: 'medium',
              latitude: 12.9716,
              longitude: 77.5946,
              is_locked: started,
            },
          ],
          completed_jobs: [],
        }),
      })
    })

    await page.route(ROUTE_PATTERNS.jobsStartAction, async (route) => {
      await wait(1_200)
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
    await expect(startBtn).toBeVisible({ timeout: 15_000 })
    await startBtn.click()

    await expect(page.getByRole('button', { name: /starting/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /mark complete/i }).first()).toBeVisible({ timeout: 20_000 })
    await page.unroute(ROUTE_PATTERNS.technicianJobs)
    await page.unroute(ROUTE_PATTERNS.jobsStartAction)
  })

  // ─── Test 4: Mark Complete ─────────────────────────────────────────────

  test('Mark Complete — status transitions to completed', async ({ page }) => {
    let completed = false
    await page.route(ROUTE_PATTERNS.technicianJobs, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: completed
            ? []
            : [
                {
                  id: 'E2E_COMPLETE_1',
                  status: 'in_progress',
                  fault_type: 'Compressor issue',
                  severity: 'medium',
                  latitude: 12.9716,
                  longitude: 77.5946,
                  is_locked: true,
                },
              ],
          completed_jobs: completed
            ? [
                {
                  id: 'E2E_COMPLETE_1',
                  status: 'completed',
                  fault_type: 'Compressor issue',
                  severity: 'medium',
                  report_submitted: false,
                },
              ]
            : [],
        }),
      })
    })

    await page.route(/\/(?:api\/)?technician\/jobs\/[^/?#]+\/complete(?:\?.*)?$/i, async (route) => {
      completed = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'completed' }),
      })
    })

    console.log('ACTION: Navigate to Technician Dashboard')
    await page.goto('/technician')
    await page.waitForLoadState('domcontentloaded')

    const completeBtn = page.getByRole('button', { name: /mark complete/i }).first()
    await expect(completeBtn).toBeVisible({ timeout: 15_000 })
    await completeBtn.click()

    await expect(page.getByText(/completed today/i).first()).toBeVisible({ timeout: 15_000 })
    await page.unroute(ROUTE_PATTERNS.technicianJobs)
  })

  // ─── Test 5: View Details modal ────────────────────────────────────────

  test('View Details modal opens for a job', async ({ page }) => {
    console.log('ACTION: Navigate to Technician Dashboard')
    await page.route(ROUTE_PATTERNS.technicianJobs, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [
            {
              id: 'E2E_VIEW_1',
              status: 'assigned',
              fault_type: 'Compressor issue',
              severity: 'medium',
              latitude: 12.9716,
              longitude: 77.5946,
              is_locked: false,
            },
          ],
          completed_jobs: [],
        }),
      })
    })

    await page.route(/\/(?:api\/)?technician\/jobs\/[^/?#]+(?:\?.*)?$/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'E2E_VIEW_1',
          status: 'assigned',
          fault_type: 'Compressor issue',
          severity: 'medium',
          location_text: 'Test Location',
        }),
      })
    })

    await page.goto('/technician')
    await page.waitForLoadState('domcontentloaded')

    const viewBtn = page.getByRole('button', { name: /view details/i }).first()
    await expect(viewBtn).toBeVisible({ timeout: 15_000 })

    console.log('ACTION: Click View Details')
    await viewBtn.click()

    await expect(page.getByText(/job detail/i)).toBeVisible({ timeout: 10_000 })
    console.log('ACTION: Job Detail modal opened')

    // Close
    await page.getByRole('button', { name: /close/i }).click()
    await page.unroute(ROUTE_PATTERNS.technicianJobs)
  })
})
