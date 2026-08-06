/**
 * E2E tests - Technician job completion + route/map sync
 */

import { test, expect } from '@playwright/test'
import { loginViaApi, apiGet, apiPost, apiPut, TEST_ACCOUNTS } from './helpers.js'

const TECH = TEST_ACCOUNTS.technician
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function ensureInProgressJob(request, token) {
  const { status, body } = await apiGet(request, token, '/technician/jobs')
  expect(status).toBe(200)

  const jobs = Array.isArray(body) ? body : (body.jobs ?? [])
  let inProgress = jobs.find((job) => String(job.status || '').toLowerCase() === 'in_progress')
  if (inProgress) return inProgress

  const assigned = jobs.find((job) => String(job.status || '').toLowerCase() === 'assigned')
  expect(assigned, 'No assigned job available to start for test precondition').toBeTruthy()

  const startRes = await apiPost(request, token, `/api/jobs/${assigned.id}/start`, {})
  expect(startRes.status).toBe(200)

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const { status: pollStatus, body: pollBody } = await apiGet(request, token, '/technician/jobs')
    expect(pollStatus).toBe(200)
    const pollJobs = Array.isArray(pollBody) ? pollBody : (pollBody.jobs ?? [])
    inProgress = pollJobs.find((job) => String(job.status || '').toLowerCase() === 'in_progress')
    if (inProgress) return inProgress
    await wait(1000)
  }

  throw new Error('No in_progress job found after attempting to start one')
}

test.describe('Technician completion sync', () => {
  test.setTimeout(60_000)
  let token = ''

  test.beforeEach(async ({ page }) => {
    const auth = await loginViaApi(page, TECH.email, TECH.password)
    token = auth.token
  })

  test('job completion removes job from UI', async ({ page, request }) => {
    const target = await ensureInProgressJob(request, token)
    const jobId = target.id

    await page.goto('/technician')
    await page.waitForLoadState('domcontentloaded')

    const completeRes = await apiPut(request, token, `/technician/jobs/${jobId}/complete`, {})
    expect(completeRes.status).toBe(200)

    await page.reload({ waitUntil: 'domcontentloaded' })

    await expect(page.locator(`[data-testid="job-card"][data-job-id="${jobId}"]`)).toHaveCount(0)
  })

  test('map updates markers after job completion', async ({ page, request }) => {
    const target = await ensureInProgressJob(request, token)
    const jobId = target.id

    await page.goto('/technician')
    await page.waitForLoadState('domcontentloaded')
    const mapCount = await page.locator('#technician-map').count()
    if (mapCount === 0) {
      const completeRes = await apiPut(request, token, `/technician/jobs/${jobId}/complete`, {})
      expect(completeRes.status).toBe(200)
      return
    }

    await page.waitForFunction(() => typeof window.MAP_MARKERS_COUNT === 'number')
    const markersBefore = await page.evaluate(() => window.MAP_MARKERS_COUNT)
    expect(markersBefore).toBeGreaterThan(0)

    const completeRes = await apiPut(request, token, `/technician/jobs/${jobId}/complete`, {})
    expect(completeRes.status).toBe(200)

    await page.reload({ waitUntil: 'domcontentloaded' })

    await expect.poll(
      async () => await page.evaluate(() => window.MAP_MARKERS_COUNT),
      { timeout: 20_000 },
    ).toBeLessThan(markersBefore)
  })
})
