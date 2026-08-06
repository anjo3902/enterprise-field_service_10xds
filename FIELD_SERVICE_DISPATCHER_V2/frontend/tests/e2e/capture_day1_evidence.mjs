import { chromium } from '@playwright/test'
import { promises as fs } from 'fs'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'

import setupTestData from './setupTestData.cjs'
import cleanupTestData from './cleanupTestData.js'
import { loginViaApi, TEST_ACCOUNTS } from './helpers.js'

const execFileAsync = promisify(execFile)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE_URL = 'http://localhost:5173'
const EVIDENCE_DIR = path.resolve(__dirname, '../../../deliverables/2026-04-17-ui-audit/evidence')
const TMP_VIDEO_DIR = path.join(EVIDENCE_DIR, '.tmp-videos')
const BLOCKER_FILE = path.join(EVIDENCE_DIR, 'CAPTURE_BLOCKERS_2026-04-20.md')

const FAULT_IMAGE = fileURLToPath(
  new URL('../../../dataset/images/blockage_critical_1.jpg', import.meta.url),
)

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
}

const captureFailures = []

const toastSelector = '[data-testid="notification-toast"]'

function nowTag() {
  return new Date().toISOString()
}

async function runStep(label, fn) {
  try {
    await fn()
    console.log(`[OK] ${label}`)
  } catch (error) {
    const message = error?.message || String(error)
    captureFailures.push({ label, message })
    console.error(`[FAIL] ${label}: ${message}`)
  }
}

async function ensureEvidenceDirs() {
  await fs.mkdir(EVIDENCE_DIR, { recursive: true })
  await fs.mkdir(TMP_VIDEO_DIR, { recursive: true })
}

async function waitForStablePage(page, urlPath) {
  await page.goto(urlPath)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1200)
}

async function fillCustomerForm(page, suffix, mode = 'manual') {
  await page.locator('input[name="customer_name"]').fill('Day Evidence User')
  await page.locator('input[name="customer_email"]').fill(TEST_ACCOUNTS.customer.email)
  await page.locator('input[name="contact"]').fill('9876543210')
  await page.locator('textarea[name="description"]').fill(`Day-1 evidence capture ${suffix}`)

  if (mode === 'gps') {
    await page.locator('input[name="city"]').fill('')
    await page.locator('input[name="state"]').fill('')
    await page.locator('input[name="pincode"]').fill('')
    await page.getByPlaceholder('Latitude').fill('12.971600')
    await page.getByPlaceholder('Longitude').fill('77.594600')
    await page.locator('input[name="location"]').fill('12.971600, 77.594600')
  } else {
    await page.locator('input[name="city"]').fill('Chennai')
    await page.locator('input[name="state"]').fill('Tamil Nadu')
    await page.locator('input[name="pincode"]').fill('600001')
    await page.locator('input[name="location"]').fill('Chennai, Tamil Nadu')
  }

  await page.locator('input[type="file"]').setInputFiles(FAULT_IMAGE)
}

async function clickSubmitWhenEnabled(page) {
  const submitButton = page.getByRole('button', { name: /submit request/i })
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await submitButton.isEnabled()) {
      await submitButton.click()
      return
    }
    await page.waitForTimeout(300)
  }
  throw new Error('Submit Request button remained disabled after form completion')
}

async function withLoggedInContext(browser, role, viewport, options, action) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: VIEWPORTS[viewport],
    ...options,
  })

  const page = await context.newPage()
  const creds = TEST_ACCOUNTS[role]

  try {
    await loginViaApi(page, creds.email, creds.password)
    await action(page, context)
  } finally {
    await context.close()
  }
}

async function captureScreenshot(browser, {
  fileName,
  role,
  viewport,
  urlPath,
  prepare,
}) {
  await runStep(`screenshot:${fileName}`, async () => {
    await withLoggedInContext(browser, role, viewport, {}, async (page) => {
      if (urlPath) {
        await waitForStablePage(page, urlPath)
      }
      if (prepare) {
        await prepare(page)
      }
      await page.waitForTimeout(900)
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, fileName),
        fullPage: true,
      })
    })
  })
}

async function captureVideo(browser, {
  fileName,
  role,
  journey,
}) {
  await runStep(`video:${fileName}`, async () => {
    const context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: VIEWPORTS.desktop,
      recordVideo: {
        dir: TMP_VIDEO_DIR,
        size: VIEWPORTS.desktop,
      },
    })

    const page = await context.newPage()
    const creds = TEST_ACCOUNTS[role]

    try {
      await loginViaApi(page, creds.email, creds.password)
      await journey(page)
      await page.waitForTimeout(1500)
    } finally {
      const pageVideo = page.video()
      await context.close()

      if (!pageVideo) {
        throw new Error('No Playwright video object found for journey capture')
      }

      const sourceWebm = await pageVideo.path()
      const targetMp4 = path.join(EVIDENCE_DIR, fileName)
      await convertWebmToMp4(sourceWebm, targetMp4)
      await fs.unlink(sourceWebm).catch(() => {})
    }
  })
}

async function convertWebmToMp4(sourceWebm, targetMp4) {
  await execFileAsync(
    'ffmpeg',
    [
      '-y',
      '-i',
      sourceWebm,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      targetMp4,
    ],
    { windowsHide: true },
  )
}

async function writeBlockerReport() {
  if (captureFailures.length === 0) {
    if (existsSync(BLOCKER_FILE)) {
      await fs.unlink(BLOCKER_FILE)
    }
    return
  }

  const lines = [
    '# Capture Blockers',
    '',
    `Generated at: ${nowTag()}`,
    '',
    'Attempted command:',
    '- `node frontend/tests/e2e/capture_day1_evidence.mjs`',
    '',
    'Blockers and immediate workaround:',
  ]

  for (const failure of captureFailures) {
    lines.push(`- ${failure.label}: ${failure.message}`)
    lines.push('  Workaround: skipped this artifact and continued all remaining captures in the same run.')
  }

  await fs.writeFile(BLOCKER_FILE, `${lines.join('\n')}\n`, 'utf8')
}

async function main() {
  await ensureEvidenceDirs()

  let setupCompleted = false
  try {
    await runStep('seed:test-data', async () => {
      await setupTestData()
      setupCompleted = true
    })

    const browser = await chromium.launch({ headless: true })
    console.log(`BROWSER_VERSION=${browser.version()}`)
    try {
      await captureScreenshot(browser, {
        fileName: '20260417_customer_dashboard_form_desktop.png',
        role: 'customer',
        viewport: 'desktop',
        urlPath: '/customer/new-request',
      })

      await captureScreenshot(browser, {
        fileName: '20260417_customer_dashboard_form_tablet.png',
        role: 'customer',
        viewport: 'tablet',
        urlPath: '/customer/new-request',
      })

      await captureScreenshot(browser, {
        fileName: '20260417_customer_dashboard_form_mobile.png',
        role: 'customer',
        viewport: 'mobile',
        urlPath: '/customer/new-request',
      })

      await captureScreenshot(browser, {
        fileName: '20260417_customer_popup_validation_desktop.png',
        role: 'customer',
        viewport: 'desktop',
        urlPath: '/customer/new-request',
        prepare: async (page) => {
          await page.locator('input[type="file"]').setInputFiles({
            name: 'invalid.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('invalid-upload-for-evidence'),
          })
          await page.locator(`${toastSelector}[data-notification-type="warning"]`).first().waitFor({
            state: 'visible',
            timeout: 15_000,
          })
        },
      })

      await captureScreenshot(browser, {
        fileName: '20260417_customer_submit_success_desktop.png',
        role: 'customer',
        viewport: 'desktop',
        urlPath: '/customer/new-request',
        prepare: async (page) => {
          await fillCustomerForm(page, `submit-${Date.now()}`, 'gps')
          await clickSubmitWhenEnabled(page)
          await page.locator(`${toastSelector}[data-notification-type="success"]`).first().waitFor({
            state: 'visible',
            timeout: 60_000,
          })
        },
      })

      await captureScreenshot(browser, {
        fileName: '20260417_customer_requests_table_desktop.png',
        role: 'customer',
        viewport: 'desktop',
        urlPath: '/customer',
      })

      await captureScreenshot(browser, {
        fileName: '20260417_customer_requests_table_tablet.png',
        role: 'customer',
        viewport: 'tablet',
        urlPath: '/customer',
      })

      await captureScreenshot(browser, {
        fileName: '20260417_customer_requests_table_mobile.png',
        role: 'customer',
        viewport: 'mobile',
        urlPath: '/customer',
      })

      await captureScreenshot(browser, {
        fileName: '20260417_customer_detail_modal_desktop.png',
        role: 'customer',
        viewport: 'desktop',
        urlPath: '/customer',
        prepare: async (page) => {
          await page.getByRole('button', { name: /view details/i }).first().click()
          await page.getByText(/request details/i).first().waitFor({ state: 'visible', timeout: 15_000 })
        },
      })

      await captureScreenshot(browser, {
        fileName: '20260417_customer_detail_modal_mobile.png',
        role: 'customer',
        viewport: 'mobile',
        urlPath: '/customer',
        prepare: async (page) => {
          await page.getByRole('button', { name: /view details/i }).first().click()
          await page.getByRole('dialog').first().waitFor({ state: 'visible', timeout: 15_000 })
        },
      })

      await captureScreenshot(browser, {
        fileName: '20260417_admin_dashboard_kpi_desktop.png',
        role: 'admin',
        viewport: 'desktop',
        urlPath: '/admin',
      })

      await captureScreenshot(browser, {
        fileName: '20260417_admin_dashboard_table_desktop.png',
        role: 'admin',
        viewport: 'desktop',
        urlPath: '/admin',
        prepare: async (page) => {
          await page.locator('table').first().waitFor({ state: 'visible', timeout: 20_000 })
          await page.locator('table').first().scrollIntoViewIfNeeded()
        },
      })

      await captureScreenshot(browser, {
        fileName: '20260417_admin_detail_modal_desktop.png',
        role: 'admin',
        viewport: 'desktop',
        urlPath: '/admin',
        prepare: async (page) => {
          await page.getByRole('button', { name: /view details/i }).first().click()
          await page.getByText(/request detail/i).first().waitFor({ state: 'visible', timeout: 15_000 })
        },
      })

      await captureScreenshot(browser, {
        fileName: '20260417_admin_detail_modal_mobile.png',
        role: 'admin',
        viewport: 'mobile',
        urlPath: '/admin',
        prepare: async (page) => {
          await page.getByRole('button', { name: /view details/i }).first().click()
          await page.getByRole('dialog').first().waitFor({ state: 'visible', timeout: 15_000 })
        },
      })

      await captureScreenshot(browser, {
        fileName: '20260417_technician_jobs_tab_desktop.png',
        role: 'technician',
        viewport: 'desktop',
        urlPath: '/technician',
      })

      await captureScreenshot(browser, {
        fileName: '20260417_technician_ai_tab_desktop.png',
        role: 'technician',
        viewport: 'desktop',
        urlPath: '/technician',
        prepare: async (page) => {
          await page.getByRole('button', { name: /ai diagnosis/i }).click()
          await page.getByText(/diagnosis notes/i).first().waitFor({ state: 'visible', timeout: 15_000 })
        },
      })

      await captureScreenshot(browser, {
        fileName: '20260417_technician_detail_modal_desktop.png',
        role: 'technician',
        viewport: 'desktop',
        urlPath: '/technician',
        prepare: async (page) => {
          await page.getByRole('button', { name: /view details/i }).first().click()
          await page.getByText(/job detail/i).first().waitFor({ state: 'visible', timeout: 15_000 })
        },
      })

      await captureScreenshot(browser, {
        fileName: '20260417_technician_route_map_desktop.png',
        role: 'technician',
        viewport: 'desktop',
        urlPath: '/technician/route',
      })

      await captureScreenshot(browser, {
        fileName: '20260417_technician_route_map_mobile.png',
        role: 'technician',
        viewport: 'mobile',
        urlPath: '/technician/route',
      })

      await captureScreenshot(browser, {
        fileName: '20260417_table_desktop_dense_state.png',
        role: 'admin',
        viewport: 'desktop',
        urlPath: '/admin/activity',
        prepare: async (page) => {
          await page.getByText(/pending human review queue/i).first().waitFor({ state: 'visible', timeout: 20_000 })
        },
      })

      await captureScreenshot(browser, {
        fileName: '20260417_table_mobile_card_state.png',
        role: 'customer',
        viewport: 'mobile',
        urlPath: '/customer',
      })

      await captureScreenshot(browser, {
        fileName: '20260417_table_empty_state_desktop.png',
        role: 'customer',
        viewport: 'desktop',
        prepare: async (page) => {
          await page.route('**/customer/my-requests', async (route) => {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: '[]',
            })
          })
          await waitForStablePage(page, '/customer')
          await page.getByText(/no requests submitted yet/i).first().waitFor({ state: 'visible', timeout: 15_000 })
        },
      })

      await captureVideo(browser, {
        fileName: '20260417_customer_journey_before.mp4',
        role: 'customer',
        journey: async (page) => {
          await waitForStablePage(page, '/customer/new-request')
          await fillCustomerForm(page, `video-${Date.now()}`, 'gps')
          await clickSubmitWhenEnabled(page)
          await page.locator(`${toastSelector}[data-notification-type="success"]`).first().waitFor({
            state: 'visible',
            timeout: 60_000,
          })
          await page.waitForTimeout(1200)
        },
      })

      await captureVideo(browser, {
        fileName: '20260417_admin_journey_before.mp4',
        role: 'admin',
        journey: async (page) => {
          await waitForStablePage(page, '/admin')
          await page.getByRole('button', { name: /view details/i }).first().click()
          await page.getByText(/request detail/i).first().waitFor({ state: 'visible', timeout: 15_000 })
          await page.getByRole('button', { name: /close details|close/i }).first().click()
          await page.waitForTimeout(1200)
        },
      })

      await captureVideo(browser, {
        fileName: '20260417_technician_journey_before.mp4',
        role: 'technician',
        journey: async (page) => {
          await waitForStablePage(page, '/technician')
          await page.getByRole('button', { name: /ai diagnosis/i }).click()
          await page.waitForTimeout(800)
          await page.getByRole('button', { name: /assigned jobs/i }).click()
          await page.getByRole('button', { name: /view details/i }).first().click()
          await page.getByText(/job detail/i).first().waitFor({ state: 'visible', timeout: 15_000 })
          await page.getByRole('button', { name: /close details|close/i }).first().click()
          await waitForStablePage(page, '/technician/route')
          await page.waitForTimeout(1000)
        },
      })
    } finally {
      await browser.close()
    }
  } finally {
    if (setupCompleted) {
      await runStep('cleanup:test-data', async () => {
        await cleanupTestData()
      })
    }

    await writeBlockerReport()

    if (captureFailures.length > 0) {
      console.error(`CAPTURE_COMPLETED_WITH_BLOCKERS=${captureFailures.length}`)
      process.exitCode = 1
    } else {
      console.log('CAPTURE_COMPLETED_WITH_BLOCKERS=0')
    }
  }
}

main().catch((error) => {
  console.error('capture_day1_evidence_failed', error)
  process.exitCode = 1
})
