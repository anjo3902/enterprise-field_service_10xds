/**
 * Shared helpers for E2E tests.
 *
 * Provides:
 *  - loginViaApi(page, email, password)   — hit /auth/login and inject the
 *    token + user object into localStorage so the SPA treats the session as
 *    authenticated without needing to go through the UI login flow every time.
 *  - apiGet / apiPost — convenience wrappers around the backend REST API
 *    that carry the auth token.
 */

const API_BASE = process.env.E2E_API_BASE || 'http://127.0.0.1:8000'

/**
 * Authenticate by calling the backend `/auth/login` endpoint directly,
 * then inject the resulting token + user into the browser's localStorage
 * so the React app picks it up on the next navigation.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user: object}>}
 */
export async function loginViaApi(page, email, password) {
  // Retry once on transient ECONNRESET/network errors (backend may be briefly busy)
  let res
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await page.request.post(`${API_BASE}/auth/login`, {
        data: { email, password },
      })
      break
    } catch (err) {
      if (attempt === 3) throw err
      // Brief pause before retrying to let the server recover
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt))
    }
  }
  if (!res.ok()) {
    const body = await res.text()
    throw new Error(`Login failed (${res.status()}): ${body}`)
  }
  const json = await res.json()
  const token = json.token || json.access_token
  const user = json.user

  // Navigate to the app origin first — localStorage is not accessible on about:blank
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  // Inject into the browser so AuthContext picks it up
  await page.evaluate(
    ({ t, u }) => {
      localStorage.setItem('fsm_token', t)
      localStorage.setItem('fsm_user', JSON.stringify(u))
      // App now reads from secure session-backed storage; seed both stores for compatibility.
      sessionStorage.setItem('fsm_token', t)
      sessionStorage.setItem('fsm_user', JSON.stringify(u))

      // Keep in-tab AuthContext state in sync without using UI login flow.
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('fsm_auth_sync')
        ch.postMessage({ type: 'LOGIN', token: t, user: u })
        ch.close()
      }
    },
    { t: token, u: user },
  )

  return { token, user }
}

/**
 * Make an authenticated GET request to the backend API.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} token
 * @param {string} path  — e.g. '/admin/kpis'
 */
export async function apiGet(request, token, path, options = {}) {
  try {
    const res = await request.get(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      ...options,
    })
    return { status: res.status(), body: await res.json() }
  } catch (err) {
    // Fallback to node fetch if the Playwright APIRequestContext was disposed.
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    return { status: res.status, body: await res.json() }
  }
}

/**
 * Make an authenticated POST request to the backend API.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} token
 * @param {string} path
 * @param {object} data
 */
export async function apiPost(request, token, path, data) {
  try {
    const res = await request.post(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      data,
    })
    return { status: res.status(), body: await res.json() }
  } catch (err) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    })
    return { status: res.status, body: await res.json() }
  }
}

/**
 * Make an authenticated PUT request to the backend API.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} token
 * @param {string} path
 * @param {object} data
 */
export async function apiPut(request, token, path, data) {
  try {
    const res = await request.put(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      data,
    })
    return { status: res.status(), body: await res.json() }
  } catch (err) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    })
    return { status: res.status, body: await res.json() }
  }
}

/** Test-account credentials — seeded via scripts/create_e2e_accounts.py */
export const TEST_ACCOUNTS = {
  customer:   { email: 'e2e.customer@test.com', password: 'E2eTest9999' },
  technician: { email: 'e2e.tech@test.com',      password: 'E2eTest9999' },
  admin:      { email: 'e2e.admin@test.com',      password: 'E2eTest9999' },
}
