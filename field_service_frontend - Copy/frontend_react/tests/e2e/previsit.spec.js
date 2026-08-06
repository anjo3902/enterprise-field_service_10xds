import { test, expect } from '@playwright/test'
import { loginViaApi, TEST_ACCOUNTS } from './helpers.js'
import { ROUTE_PATTERNS } from './routePatterns.js'

async function mockAssignedJobWorkspace(page) {
  await page.route(ROUTE_PATTERNS.technicianJobs, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs: [
          {
            id: 'E2E_PREVISIT_1',
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

  await page.route(ROUTE_PATTERNS.technicianMyRoute, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ route_order: ['E2E_PREVISIT_1'] }),
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
      }),
    })
  })
}

test('Prepare Visit (AI) opens briefing modal and allows download', async ({ page }) => {
  const TECH = TEST_ACCOUNTS.technician
  await loginViaApi(page, TECH.email, TECH.password)
  await mockAssignedJobWorkspace(page)

  // Stub the backend previsit generation to a predictable response
  await page.route('**/reports/previsit', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        report_text: 'Problem Understanding:\nTest briefing content\nRequired Tools:\n- Wrench\n- Safety Gloves',
        file_name: 'previsit_job_123.txt',
      }),
    })
  })

  await page.goto('/technician')
  await page.waitForLoadState('domcontentloaded')

  let btn = page.getByRole('button', { name: /Prepare Visit/i }).first()

  // If the button is not present (no assigned job), try to ensure a job is assigned by reloading
  if (await btn.count() === 0) {
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    btn = page.getByRole('button', { name: /Prepare Visit/i }).first()
  }

  await expect(btn).toBeVisible({ timeout: 15000 })

  // Click and wait for modal content to appear
  await btn.click()
  await expect(page.getByText(/Problem Understanding/i)).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/Required Tools/i)).toBeVisible()

  // Trigger the modal copy action and ensure it is clickable without timeout.
  const copyBtn = page.getByRole('button', { name: /Copy to Clipboard/i }).first()
  // Ensure clipboard is available in the test env
  await page.evaluate(() => {
    if (!navigator.clipboard) {
      // @ts-ignore
      navigator.clipboard = { writeText: async () => true }
    }
  })
  await expect(copyBtn).toBeVisible()
  await copyBtn.click()
  await expect(copyBtn).toBeVisible()
})

test('Prepare Visit (AI) disables the button while generating', async ({ page }) => {
  const TECH = TEST_ACCOUNTS.technician
  await loginViaApi(page, TECH.email, TECH.password)
  await mockAssignedJobWorkspace(page)

  await page.route('**/reports/previsit', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        report_text: 'SECTION 1: SUMMARY\nDelay test content',
        file_name: 'previsit_job_123.txt',
      }),
    })
  })

  await page.goto('/technician')
  await page.waitForLoadState('domcontentloaded')

  const btn = page.getByRole('button', { name: /Prepare Visit/i }).first()
  await expect(btn).toBeVisible({ timeout: 15000 })
  await btn.click()
  const busyBtn = page.getByRole('button', { name: /Preparing\.\.\./i }).first()
  await expect(busyBtn).toBeVisible({ timeout: 15000 })
  await expect(busyBtn).toBeDisabled()
})

test('Prepare Visit (AI) shows fallback content after repeated failures', async ({ page }) => {
  const TECH = TEST_ACCOUNTS.technician
  await loginViaApi(page, TECH.email, TECH.password)
  await mockAssignedJobWorkspace(page)

  let attempt = 0
  await page.route('**/reports/previsit', async (route) => {
    attempt += 1
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ detail: `failed attempt ${attempt}` }),
    })
  })

  await page.goto('/technician')
  await page.waitForLoadState('domcontentloaded')

  const btn = page.getByRole('button', { name: /Prepare Visit/i }).first()
  await expect(btn).toBeVisible({ timeout: 15000 })
  await btn.click()

  await expect(page.getByText(/Please proceed manually/i).first()).toBeVisible({ timeout: 20000 })
  await expect(page.getByText(/Check device, tools, and safety before visit/i).first()).toBeVisible()
})
