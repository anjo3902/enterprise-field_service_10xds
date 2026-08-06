import { test, expect } from '@playwright/test'
import { loginViaApi, TEST_ACCOUNTS } from './helpers.js'
import { ROUTE_PATTERNS } from './routePatterns.js'

const ISSUE_PLACEHOLDER = 'Describe what you found (symptoms, condition, visible damage)'
const ROOT_CAUSE_PLACEHOLDER = 'Explain why the issue occurred (if known)'
const WORK_DONE_PLACEHOLDER = 'Describe actions taken to fix the issue'
const TIME_TAKEN_PLACEHOLDER = 'Enter time in minutes (1-600)'
const NOTES_PLACEHOLDER = 'Additional remarks (optional)'

async function mockReportWorkspace(page) {
  const state = { submitted: false }

  await page.route(ROUTE_PATTERNS.technicianJobs, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs: [],
        completed_jobs: [
          {
            id: 'E2E_REPORT_1',
            status: 'completed',
            fault_type: 'Compressor fault',
            severity: 'high',
            report_submitted: state.submitted,
          },
        ],
      }),
    })
  })

  await page.route('**/technician/submit-report', async (route) => {
    state.submitted = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Report submitted successfully' }),
    })
  })

  await page.route('**/technician/report/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        report_data: {
          job_id: 'E2E_REPORT_1',
          submitted_at: new Date().toISOString(),
          technician_name: 'E2E Tech',
          service_location: 'Test Site',
          issue_observed: 'Issue Observed',
          root_cause: 'Root Cause',
          work_done: 'Work Done',
          parts_used: 'Materials Used',
          time_taken: '35 minutes',
          customer_comments: 'All good',
          notes: 'Additional Notes',
          before_photo_url: '/uploads/before.png',
          after_photo_url: '/uploads/after.png',
          materials_used: [{ name: 'Alignment shims', quantity: '2' }],
        },
      }),
    })
  })

  await page.route('**/technician/report-photo-upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ photo_url: '/uploads/mock.png' }),
    })
  })
}

test('Submit Report triggers form, AI assist, and successful submission', async ({ page }) => {
  test.slow()
  const TECH = TEST_ACCOUNTS.technician
  await loginViaApi(page, TECH.email, TECH.password)
  await mockReportWorkspace(page)

  await page.route('**/reports/improve', async (route) => {
    const request = await route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ improved_text: `[IMPROVED] ${request.text}` }),
    })
  })

  await page.goto('/technician')
  await page.waitForLoadState('domcontentloaded')

  const submitBtn = page.getByRole('button', { name: /Submit Report/i }).first()
  await expect(submitBtn).toBeVisible({ timeout: 15_000 })
  await submitBtn.click()

  await expect(page.getByText('Submit Job Report')).toBeVisible({ timeout: 5000 })

  await page.getByPlaceholder(ISSUE_PLACEHOLDER).fill('bad')
  await page.getByPlaceholder(WORK_DONE_PLACEHOLDER).fill('short')
  await page.getByPlaceholder(TIME_TAKEN_PLACEHOLDER).fill('0')
  await page.getByRole('button', { name: 'Submit Report', exact: true }).last().click()
  await expect(page.getByText('Please describe the issue properly (min 10 characters)').first()).toBeVisible({ timeout: 5000 })

  await page.getByPlaceholder(ISSUE_PLACEHOLDER).fill('The compressor was not working and showed clear signs of capacitor damage.')
  await page.getByPlaceholder(ROOT_CAUSE_PLACEHOLDER).fill('Capacitor failure due to wear and heat exposure.')
  await page.getByPlaceholder(WORK_DONE_PLACEHOLDER).fill('Replaced the capacitor with a new 50uF unit and verified stable operation.')
  await page.getByPlaceholder('Material name').first().fill('Capacitor 50uF')
  await page.getByPlaceholder('Qty').first().fill('1')
  await page.getByPlaceholder(TIME_TAKEN_PLACEHOLDER).fill('30')
  await page.getByPlaceholder(NOTES_PLACEHOLDER).fill('Customer satisfied with the repair')

  const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2WmWQAAAAASUVORK5CYII=', 'base64')
  await page.locator('input[type="file"]').nth(0).setInputFiles({ name: 'before.png', mimeType: 'image/png', buffer: pngBytes })
  await page.locator('input[type="file"]').nth(1).setInputFiles({ name: 'after.png', mimeType: 'image/png', buffer: pngBytes })

  const improveBtn = page.getByTestId('ai-improve-issue')
  await improveBtn.click({ force: true })
  await page.waitForTimeout(500)

  const value = await page.getByPlaceholder(ISSUE_PLACEHOLDER).inputValue()
  expect(value).toContain('[IMPROVED]')

  await page.getByRole('button', { name: 'Submit Report', exact: true }).last().click()
  await page.waitForTimeout(500)

  await expect(page.getByText('Report Submitted').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Submit Job Report')).toHaveCount(0)
})

test('Prevent duplicate report submission', async ({ page }) => {
  const TECH = TEST_ACCOUNTS.technician
  await loginViaApi(page, TECH.email, TECH.password)
  await mockReportWorkspace(page)

  await page.route('**/reports/improve', async (route) => {
    const request = await route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ improved_text: `[IMPROVED] ${request.text}` }),
    })
  })

  await page.goto('/technician')
  await page.waitForLoadState('domcontentloaded')

  const submitBtn = page.getByRole('button', { name: /Submit Report/i }).first()
  await expect(submitBtn).toBeVisible({ timeout: 15_000 })
  await submitBtn.click()

  await page.getByPlaceholder(ISSUE_PLACEHOLDER).fill('Test issue details include visible leakage on compressor casing.')
  await page.getByPlaceholder(WORK_DONE_PLACEHOLDER).fill('Test work done includes replacing seal and tightening fittings.')
  await page.getByPlaceholder('Material name').first().fill('Seal kit')
  await page.getByPlaceholder('Qty').first().fill('1')
  await page.getByPlaceholder(TIME_TAKEN_PLACEHOLDER).fill('25')

  await page.getByRole('button', { name: 'Submit Report', exact: true }).last().click()
  await page.waitForTimeout(500)

  await expect(page.getByText('Report Submitted').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Submit Job Report')).toHaveCount(0)
})

test('Submit then open View Report immediately', async ({ page }) => {
  const TECH = TEST_ACCOUNTS.technician
  await loginViaApi(page, TECH.email, TECH.password)
  await mockReportWorkspace(page)

  await page.route('**/reports/improve', async (route) => {
    const request = await route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ improved_text: `[IMPROVED] ${request.text}` }) })
  })

  await page.goto('/technician')
  await page.waitForLoadState('domcontentloaded')

  const submitBtn = page.getByRole('button', { name: /Submit Report/i }).first()
  await expect(submitBtn).toBeVisible({ timeout: 15_000 })
  await submitBtn.click()
  await expect(page.getByText('Submit Job Report')).toBeVisible({ timeout: 5000 })

  await page.getByPlaceholder(ISSUE_PLACEHOLDER).fill('Immediate view test issue with unstable compressor noise and vibration.')
  await page.getByPlaceholder(WORK_DONE_PLACEHOLDER).fill('Immediate view work included alignment correction and component retightening.')
  await page.getByPlaceholder('Material name').first().fill('Alignment shims')
  await page.getByPlaceholder('Qty').first().fill('2')
  await page.getByPlaceholder(TIME_TAKEN_PLACEHOLDER).fill('35')

  await page.getByRole('button', { name: 'Submit Report', exact: true }).last().click()
  await page.waitForTimeout(500)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('✔ Submitted').first()).toBeVisible({ timeout: 10_000 })

  const viewReportBtn = page.getByRole('button', { name: /View Report/i }).first()
  await expect(viewReportBtn).toBeVisible({ timeout: 15_000 })
  await viewReportBtn.click()

  await expect(page.getByText('FIELD SERVICE REPORT').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Issue Observed').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Root Cause').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Work Done').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Materials Used').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Before Image').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('After Image').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Time Taken').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Additional Notes').first()).toBeVisible({ timeout: 15_000 })
})
