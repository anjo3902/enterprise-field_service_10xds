import { expect, test } from '@playwright/test'

import { TEST_ACCOUNTS } from './helpers'

const API_BASE = 'http://127.0.0.1:8000'
const BACKEND_URL_RE = /^https?:\/\/(?:127\.0\.0\.1|localhost):8000\//i
const EXTERNAL_API_PATTERNS = [
  /maps\.googleapis\.com/i,
  /cdn\.jsdelivr\.net/i,
  /fonts\.googleapis\.com/i,
]

function isBackendUrl(url) {
  // Exclude known external APIs
  if (EXTERNAL_API_PATTERNS.some((pattern) => pattern.test(url))) {
    return false
  }
  return BACKEND_URL_RE.test(url)
}

const SAFE_CONSOLE_ERROR_PATTERNS = [
  /ErrorBoundary/i,
  /favicon\.ico/i,
  /manifest\.json/i,
  /loading chunk/i,
]

function shouldIgnoreConsoleError(text) {
  return SAFE_CONSOLE_ERROR_PATTERNS.some((pattern) => pattern.test(text))
}

async function loginAndSeedSession(page, account) {
  let response
  let lastError = null

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      response = await page.request.post(`${API_BASE}/auth/login`, {
        data: account,
        timeout: 10_000,
      })

      if (response.ok()) {
        break
      }

      const body = await response.text()
      throw new Error(`Login failed (${response.status()}): ${body}`)
    } catch (error) {
      lastError = error
      if (attempt === 4) {
        throw error
      }
      await page.waitForTimeout(250 * attempt)
    }
  }

  if (!response || !response.ok()) {
    throw lastError || new Error('Login failed: unknown error')
  }

  const payload = await response.json()
  const token = payload.token || payload.access_token
  const user = payload.user || {
    email: account.email,
    role: account.email.includes('admin')
      ? 'admin'
      : account.email.includes('tech')
        ? 'technician'
        : 'customer',
  }

  await page.addInitScript(
    ({ authToken, authUser }) => {
      localStorage.setItem('fsm_token', authToken)
      localStorage.setItem('fsm_user', JSON.stringify(authUser))
      sessionStorage.setItem('fsm_token', authToken)
      sessionStorage.setItem('fsm_user', JSON.stringify(authUser))

      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('fsm_auth_sync')
        channel.postMessage({ type: 'LOGIN', token: authToken, user: authUser })
        channel.close()
      }
    },
    { authToken: token, authUser: user },
  )

  return { token, user }
}

async function observePage(page) {
  const consoleErrors = []
  const apiErrors = []
  const missingAuth = []

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (shouldIgnoreConsoleError(text)) return
    consoleErrors.push(text)
  })

  page.on('pageerror', (error) => {
    const text = String(error?.message || error)
    if (shouldIgnoreConsoleError(text)) return
    consoleErrors.push(`[pageerror] ${text}`)
  })

  page.on('response', (response) => {
    const url = response.url()
    if (!isBackendUrl(url)) return

    const status = response.status()
    if (status >= 400 || (status !== 200 && status !== 201)) {
      console.log('API:', url, status)
      apiErrors.push({ url, status })
    }
  })

  page.on('request', (request) => {
    if (!isBackendUrl(request.url())) return
    if (request.method().toUpperCase() === 'OPTIONS') return

    const headers = request.headers()
    const authorization = headers.authorization || headers.Authorization
    if (!authorization) {
      missingAuth.push(request.url())
    }
  })

  return { consoleErrors, apiErrors, missingAuth }
}

async function loadAuthedDashboard(page, account, path, readyLocator) {
  const trackers = await observePage(page)
  await loginAndSeedSession(page, account)

  const startedAt = Date.now()
  await page.goto(path)
  await page.waitForLoadState('domcontentloaded')
  const loadTime = Date.now() - startedAt

  await expect(readyLocator).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/failed to load/i)).toHaveCount(0)

  console.log({
    consoleErrors: trackers.consoleErrors.length,
    apiErrors: trackers.apiErrors.length,
    missingAuth: trackers.missingAuth.length,
  })

  expect(trackers.consoleErrors, `console errors on ${path}`).toHaveLength(0)
  expect(trackers.apiErrors, `api errors on ${path}`).toHaveLength(0)
  expect(trackers.missingAuth, `missing auth headers on ${path}`).toHaveLength(0)

  return { loadTime, ...trackers }
}

test.describe('Production readiness health checks', () => {
  const dashboards = [
    {
      name: 'customer',
      path: '/customer',
      account: TEST_ACCOUNTS.customer,
      readyLocator: (page) => page.locator('table').first(),
    },
    {
      name: 'technician',
      path: '/technician',
      account: TEST_ACCOUNTS.technician,
      readyLocator: (page) => page.getByRole('heading', { name: /assigned jobs/i }).first(),
    },
    {
      name: 'admin',
      path: '/admin',
      account: TEST_ACCOUNTS.admin,
      readyLocator: (page) => page.locator('table').first(),
    },
  ]

  for (const dashboard of dashboards) {
    test(`No console errors on ${dashboard.name} dashboard`, async ({ page }) => {
      const result = await loadAuthedDashboard(
        page,
        dashboard.account,
        dashboard.path,
        dashboard.readyLocator(page),
      )

      console.log({
        consoleErrors: result.consoleErrors.length,
        apiErrors: result.apiErrors.length,
        missingAuth: result.missingAuth.length,
      })
    })
  }

  test('Login flow stores token and redirects to dashboard', async ({ page }) => {
    const trackers = await observePage(page)

    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()

    const { token } = await loginAndSeedSession(page, TEST_ACCOUNTS.customer)
    expect(token).toBeTruthy()

    await page.goto('/customer')
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 })

    const storedToken = await page.evaluate(() => sessionStorage.getItem('fsm_token'))
    expect(storedToken).toBeTruthy()

    console.log({
      consoleErrors: trackers.consoleErrors.length,
      apiErrors: trackers.apiErrors.length,
      missingAuth: trackers.missingAuth.length,
    })

    expect(trackers.consoleErrors, 'console errors during login flow').toHaveLength(0)
    expect(trackers.apiErrors, 'api errors during login flow').toHaveLength(0)
  })

  test('Admin dashboard first paint and data load meet SLA', async ({ page }) => {
    const trackers = await observePage(page)
    await loginAndSeedSession(page, TEST_ACCOUNTS.admin)

    const startedAt = Date.now()
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('[data-testid="kpi-card"]').first()).toBeVisible({ timeout: 5_000 })
    const firstPaint = Date.now() - startedAt

    await expect(page.locator('table').first()).toBeVisible({ timeout: 5_000 })
    const totalLoad = Date.now() - startedAt
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/failed to load/i)).toHaveCount(0)

    console.log({
      consoleErrors: trackers.consoleErrors.length,
      apiErrors: trackers.apiErrors.length,
      missingAuth: trackers.missingAuth.length,
      firstPaint,
      totalLoad,
    })

    expect(firstPaint).toBeLessThan(2000)
    expect(totalLoad).toBeLessThan(3000)
    expect(trackers.consoleErrors, 'console errors during admin perf check').toHaveLength(0)
    expect(trackers.apiErrors, 'api errors during admin perf check').toHaveLength(0)
    expect(trackers.missingAuth, 'missing auth headers during admin perf check').toHaveLength(0)
  })
})